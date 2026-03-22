const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient, AssetType, AssetStatus, Role } = require('@prisma/client');

const prisma = new PrismaClient();

const BOOK_PATH = path.resolve(__dirname, '../../Book1.md');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678123456781234567812345678';

const ASSET_OVERRIDES = {
  '6303-0002': {
    name: 'API-3PAR8200',
    type: AssetType.STORAGE,
    sn: '7CE022P0TB',
  },
};

function normalizeLineValue(value) {
  return value.replace(/\r/g, '').trim();
}

function parseMarkdownRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('| ---'))
    .slice(1)
    .map((line) => line.split('|').slice(1, -1).map(normalizeLineValue))
    .filter((columns) => columns.length >= 13);
}

function normalizeAssetType(raw) {
  const value = raw.trim().toUpperCase();
  if (value === 'SERVER') return AssetType.SERVER;
  if (value === 'STORAGE') return AssetType.STORAGE;
  if (value === 'SWITCH') return AssetType.SWITCH;
  if (value === 'SP') return AssetType.SP;
  return AssetType.NETWORK;
}

function normalizeAccessType(raw, assetType, version) {
  const ipType = raw.toLowerCase();
  const versionText = (version || '').toLowerCase();

  if (assetType === AssetType.SERVER) {
    if (
      versionText.includes('esxi') ||
      versionText.includes('solaris') ||
      versionText.includes('linux') ||
      versionText.includes('windows') ||
      versionText.includes('ubuntu') ||
      versionText.includes('rocky')
    ) {
      return 'Host';
    }

    if (
      versionText.includes('ilo') ||
      versionText.includes('idrac') ||
      versionText.includes('ipmi') ||
      versionText.includes('bmc') ||
      versionText.includes('afe')
    ) {
      return 'Management';
    }
  }

  return ipType.includes('host') ? 'Host' : 'Management';
}

function normalizeAccessMethod(raw) {
  const value = raw.toUpperCase();
  const hasWeb = value.includes('WEB') || value.includes('HTTP');
  const hasSsh = value.includes('SSH');

  if (hasWeb && hasSsh) return 'WEB/SSH';
  if (hasWeb) return 'WEB';
  if (hasSsh) return 'SSH';
  return value || null;
}

function splitMultiValue(value) {
  return value
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function pairCredentials(usernameRaw, passwordRaw) {
  const usernames = splitMultiValue(usernameRaw).filter((item) => item !== '-');
  const passwords = splitMultiValue(passwordRaw);

  return usernames.map((username, index) => ({
    username,
    password: passwords[index] && passwords[index] !== '-' ? passwords[index] : '',
  }));
}

function isMeaningfulName(name) {
  const value = name.trim();
  if (!value) return false;
  const lowered = value.toLowerCase();
  if (lowered === 'localhost.localdomain') return false;
  if (lowered === '/ localhost.localdomain') return false;
  if (lowered === '/localhost.localdomain') return false;
  return true;
}

function inferNodeToken(name) {
  const value = name.trim();
  const cvmMatch = value.match(/-([A-D])-CVM$/i);
  if (cvmMatch) {
    return cvmMatch[1].toUpperCase();
  }

  const mgmtMatch = value.match(/mgmt(\d+)$/i);
  if (mgmtMatch) {
    return mgmtMatch[1];
  }

  const esxiMatch = value.match(/esxi\d+$/i);
  if (esxiMatch) {
    const numMatch = value.match(/(\d+)$/);
    return numMatch ? numMatch[1] : null;
  }

  return null;
}

function buildNodeLabelMap(rows) {
  const groupedByVersion = new Map();

  rows.forEach((row) => {
    const key = `${row.accessType}::${row.version || ''}`;
    if (!groupedByVersion.has(key)) {
      groupedByVersion.set(key, []);
    }
    groupedByVersion.get(key).push(row);
  });

  groupedByVersion.forEach((groupRows) => {
    groupRows.sort((left, right) => left.ipAddress.localeCompare(right.ipAddress));
    groupRows.forEach((row, index) => {
      row.__groupIndex = index;
    });
  });

  const indexToNode = new Map();
  rows.forEach((row) => {
    const token = inferNodeToken(row.assetName);
    if (!token && !isMeaningfulName(row.assetName)) {
      return;
    }

    if (row.__groupIndex !== undefined && token) {
      indexToNode.set(row.__groupIndex, `Node ${token}`);
    }
  });

  return rows.map((row) => {
    const directToken = inferNodeToken(row.assetName);
    if (directToken) {
      return { ...row, nodeLabel: `Node ${directToken}` };
    }

    if (row.__groupIndex !== undefined && indexToNode.has(row.__groupIndex)) {
      return { ...row, nodeLabel: indexToNode.get(row.__groupIndex) };
    }

    return { ...row, nodeLabel: null };
  });
}

function pickPrimaryRow(rows, assetType) {
  const preferredType = assetType === AssetType.SERVER ? 'Host' : 'Management';
  const preferredRows = rows.filter((row) => row.accessType === preferredType);
  const meaningfulPreferred = preferredRows.find((row) => isMeaningfulName(row.assetName));
  if (meaningfulPreferred) return meaningfulPreferred;

  const meaningfulAny = rows.find((row) => isMeaningfulName(row.assetName));
  if (meaningfulAny) return meaningfulAny;

  return rows[0];
}

function dedupeByKey(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const markdown = fs.readFileSync(BOOK_PATH, 'utf8');
  const rows = parseMarkdownRows(markdown).map((columns) => {
    const [assetId, assetName, assetType, rack, location, version, ipAddress, ipType, manageType, username, password, brandModel, sn] =
      columns;

    return {
      assetId,
      assetName,
      assetType: normalizeAssetType(assetType),
      rack,
      location,
      version,
      ipAddress,
      accessType: normalizeAccessType(ipType, normalizeAssetType(assetType), version),
      accessMethod: normalizeAccessMethod(manageType),
      usernames: username,
      passwords: password,
      brandModel,
      sn,
    };
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true, email: true },
  });

  if (!adminUser) {
    throw new Error('No ADMIN user found. Cannot assign createdByUserId.');
  }

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.assetId)) {
      grouped.set(row.assetId, []);
    }
    grouped.get(row.assetId).push(row);
  }

  const preparedAssets = Array.from(grouped.entries()).map(([assetId, assetRows]) => {
    const override = ASSET_OVERRIDES[assetId];
    const effectiveRows = override
      ? assetRows.filter((row) => row.assetName === override.name || row.sn === override.sn || row.assetType === override.type)
      : assetRows;

    const assetType = override?.type ?? effectiveRows[0].assetType;
    const rowsWithNodeLabels = buildNodeLabelMap(effectiveRows);
    const primaryRow = pickPrimaryRow(rowsWithNodeLabels, assetType);

    const ipAllocations = dedupeByKey(
      rowsWithNodeLabels.map((row) => ({
        address: row.ipAddress,
        type: row.accessType,
        nodeLabel: row.nodeLabel,
        manageType: row.accessMethod,
        version: row.version || null,
      })),
      (item) => `${item.address}::${item.type}::${item.nodeLabel || ''}::${item.manageType || ''}::${item.version || ''}`,
    );

    const credentials = dedupeByKey(
      rowsWithNodeLabels.flatMap((row) =>
        pairCredentials(row.usernames, row.passwords).map((credential) => ({
          username: credential.username,
          password: credential.password,
          type: row.accessType,
          nodeLabel: row.nodeLabel,
          manageType: row.accessMethod,
          version: row.version || null,
        })),
      ),
      (item) => `${item.username}::${item.password}::${item.type}::${item.nodeLabel || ''}::${item.manageType || ''}::${item.version || ''}`,
    );

    return {
      assetId,
      name: override?.name ?? primaryRow.assetName,
      type: assetType,
      rack: primaryRow.rack || null,
      location: primaryRow.location || null,
      brandModel: primaryRow.brandModel || null,
      sn: override?.sn ?? primaryRow.sn ?? null,
      status: AssetStatus.ACTIVE,
      createdByUserId: adminUser.id,
      ipAllocations,
      credentials,
    };
  });

  let created = 0;
  let updated = 0;

  for (const asset of preparedAssets) {
    const existing = await prisma.asset.findUnique({
      where: { assetId: asset.assetId },
      select: { id: true },
    });

    if (existing) {
      await prisma.asset.update({
        where: { assetId: asset.assetId },
        data: {
          name: asset.name,
          type: asset.type,
          rack: asset.rack,
          location: asset.location,
          brandModel: asset.brandModel,
          sn: asset.sn,
          status: asset.status,
          ipAllocations: {
            deleteMany: {},
            create: asset.ipAllocations,
          },
          credentials: {
            deleteMany: {},
            create: asset.credentials.map((credential) => ({
              username: credential.username,
              type: credential.type,
              nodeLabel: credential.nodeLabel,
              manageType: credential.manageType,
              version: credential.version,
              encryptedPassword: encrypt(credential.password),
            })),
          },
        },
      });
      updated += 1;
      continue;
    }

    await prisma.asset.create({
      data: {
        assetId: asset.assetId,
        name: asset.name,
        type: asset.type,
        rack: asset.rack,
        location: asset.location,
        brandModel: asset.brandModel,
        sn: asset.sn,
        status: asset.status,
        createdByUserId: asset.createdByUserId,
        ipAllocations: {
          create: asset.ipAllocations,
        },
        credentials: {
          create: asset.credentials.map((credential) => ({
            username: credential.username,
            type: credential.type,
            nodeLabel: credential.nodeLabel,
            manageType: credential.manageType,
            version: credential.version,
            encryptedPassword: encrypt(credential.password),
          })),
        },
      },
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        sourceRows: rows.length,
        assetsPrepared: preparedAssets.length,
        created,
        updated,
        adminUser: adminUser.email,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
