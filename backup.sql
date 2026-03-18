--
-- PostgreSQL database dump
--

\restrict eeBBYYezs1IrRsphpaNaDsSHId76bvx4yfeA0fowdaI2Hqv5ifthwIGKmWzYfZz

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: infrapilot
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO infrapilot;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: infrapilot
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: infrapilot
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'MAINTENANCE',
    'DECOMMISSIONED'
);


ALTER TYPE public."AssetStatus" OWNER TO infrapilot;

--
-- Name: AssetType; Type: TYPE; Schema: public; Owner: infrapilot
--

CREATE TYPE public."AssetType" AS ENUM (
    'SERVER',
    'STORAGE',
    'SWITCH',
    'SP',
    'NETWORK'
);


ALTER TYPE public."AssetType" OWNER TO infrapilot;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: infrapilot
--

CREATE TYPE public."AuditAction" AS ENUM (
    'VIEW_PASSWORD',
    'COPY_PASSWORD',
    'LOGIN',
    'CREATE_ASSET',
    'UPDATE_ASSET',
    'DELETE_ASSET',
    'CREATE_CREDENTIAL',
    'UPDATE_CREDENTIAL',
    'CREATE_USER',
    'UPDATE_USER_ROLE',
    'RESET_USER_PASSWORD',
    'CHANGE_OWN_PASSWORD'
);


ALTER TYPE public."AuditAction" OWNER TO infrapilot;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: infrapilot
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'EDITOR',
    'VIEWER'
);


ALTER TYPE public."Role" OWNER TO infrapilot;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Asset; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    name text NOT NULL,
    type public."AssetType" NOT NULL,
    environment text,
    location text,
    "customMetadata" jsonb,
    "osVersion" text,
    status public."AssetStatus" DEFAULT 'ACTIVE'::public."AssetStatus" NOT NULL,
    owner text,
    department text,
    "purchaseDate" timestamp(3) without time zone,
    "warrantyExpiration" timestamp(3) without time zone,
    vendor text,
    dependencies text,
    "parentId" text,
    "createdByUserId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "assetId" text,
    "brandModel" text,
    "manageType" text,
    rack text,
    sn text
);


ALTER TABLE public."Asset" OWNER TO infrapilot;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action public."AuditAction" NOT NULL,
    "targetId" text,
    "ipAddress" text,
    details text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO infrapilot;

--
-- Name: Credential; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."Credential" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    username text NOT NULL,
    "encryptedPassword" text NOT NULL,
    "lastChangedDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type text,
    "manageType" text,
    version text,
    "nodeLabel" text
);


ALTER TABLE public."Credential" OWNER TO infrapilot;

--
-- Name: DatabaseAccount; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."DatabaseAccount" (
    id text NOT NULL,
    "databaseInventoryId" text NOT NULL,
    username text NOT NULL,
    role text,
    "encryptedPassword" text NOT NULL,
    privileges text[] DEFAULT ARRAY[]::text[],
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DatabaseAccount" OWNER TO infrapilot;

--
-- Name: DatabaseInventory; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."DatabaseInventory" (
    id text NOT NULL,
    name text NOT NULL,
    engine text NOT NULL,
    version text,
    environment text,
    host text NOT NULL,
    "ipAddress" text NOT NULL,
    port text,
    "serviceName" text,
    owner text,
    "backupPolicy" text,
    replication text,
    "linkedApps" text[] DEFAULT ARRAY[]::text[],
    "maintenanceWindow" text,
    status text,
    note text,
    "createdByUserId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DatabaseInventory" OWNER TO infrapilot;

--
-- Name: IPAllocation; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."IPAllocation" (
    id text NOT NULL,
    address text NOT NULL,
    type text,
    "assetId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "manageType" text,
    version text,
    "nodeLabel" text
);


ALTER TABLE public."IPAllocation" OWNER TO infrapilot;

--
-- Name: PatchInfo; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."PatchInfo" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "currentVersion" text,
    "latestVersion" text,
    "eolDate" timestamp(3) without time zone,
    "lastPatchedDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PatchInfo" OWNER TO infrapilot;

--
-- Name: User; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'VIEWER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    username text NOT NULL,
    "displayName" text NOT NULL,
    "avatarSeed" text NOT NULL,
    "avatarImage" text
);


ALTER TABLE public."User" OWNER TO infrapilot;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: infrapilot
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO infrapilot;

--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."Asset" (id, name, type, environment, location, "customMetadata", "osVersion", status, owner, department, "purchaseDate", "warrantyExpiration", vendor, dependencies, "parentId", "createdByUserId", "createdAt", "updatedAt", "assetId", "brandModel", "manageType", rack, sn) FROM stdin;
69591373-df0b-4d8d-8347-f838b4d86daa	TRD-APIControlDom	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.45	2026-03-15 10:23:43.55	6303-0001	Oracle SPARC T8-1 Server	\N	1C-04	2029NMC00P
c75887d5-a291-4740-9677-91d6c10a0f67	6403SANSWTRD158	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.463	2026-03-15 10:23:43.576	6403-3001	HPE StoreFabric SN3600B	\N	1C-04	EZL1928R07A
ba41ac88-9a9d-4a25-b2f2-a02e4bb53a4b	6403SANSWTRD159	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.475	2026-03-15 10:23:43.594	6403-3002	HPE StoreFabric SN3600B	\N	1C-04	EZL1928R077
a49476fb-857e-4af0-8fef-e5d07776c74c	6403ESXiTRD161	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.485	2026-03-15 10:23:43.611	6403-1001	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRB
f4e354dd-abbf-4166-8d95-c13b6d5b042a	6403ESXiTRD162	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.499	2026-03-15 10:23:43.634	6403-1002	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRG
9bf3d14a-3b85-4cfa-956b-e23c56216a9f	6403ESXiTRD163	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.511	2026-03-15 10:23:43.656	6403-1003	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRN
552145d5-a5db-4034-81f1-8798aa2e38cf	6403ESXiTRD164	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.522	2026-03-15 10:23:43.679	6403-1004	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRD
0c5fb156-0ddb-4850-87ff-170b71543c64	6403ESXiTRD165	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.535	2026-03-15 10:23:43.7	6403-1005	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRL
f83ee8b2-2bf6-48f4-8d78-64c447b6c05d	6403ESXiTRD166	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.548	2026-03-15 10:23:43.718	6403-1006	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNRJ
ec23fed0-2d89-4dcc-8489-252369a383cd	6403ESXiTRD167	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.563	2026-03-15 10:23:43.735	6403-1007	HPE ProLiant DL360 G10	\N	1C-04	SGH105TNR8
4c09e8c8-e6ec-4cbe-a857-f491287f550d	NTNX-17SM6C140320-A-CVM	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.576	2026-03-15 10:23:43.754	6009-6001	Nutanix รุ่น NX-1065-G5	\N	1C-07	17SM6C140320
f8c97db1-df09-45b5-8011-877ad060eab1	NTNX-17SM6C140322-A-CVM	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.589	2026-03-15 10:23:43.777	6009-6003	Nutanix รุ่น NX-1065-G5	\N	1C-07	17SM6C140322
3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	NTNX-17SM6C140463-A-CVM	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.605	2026-03-15 10:23:43.799	6009-6004	Nutanix รุ่น NX-1065-G5	\N	1C-07	17SM6C140463
805f1749-7f0b-402b-99b1-a0519836c627	NTNX-17SM6C140321-A-CVM	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.62	2026-03-15 10:23:43.82	6009-6002	Nutanix รุ่น NX-1065-G5	\N	1C-07	17SM6C140321
ffba346c-9eb3-4fa0-93ed-5e98495521df	192-168-13-157.treasury.go.th	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.635	2026-03-15 10:23:43.842	6009-6005	Simplivity OmniCube CN-2400	\N	1C-07	4G1ZBH2
3aef4e44-5ca7-4c0f-8561-a801babfdc5d	192-168-13-158.treasury.go.th	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.648	2026-03-15 10:23:43.859	6009-6006	Simplivity OmniCube CN-2400	\N	1C-07	4GBZBH2
74592ab5-0bf5-4074-ba32-58a1703fef71	ESX-DB1	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.661	2026-03-15 10:23:43.877	6009-6008	Dell PowerEdge R630	\N	1C-07	B92FHJ2
fc3147c8-72f6-4e1d-b6c1-11041fee4d9e	ESX-DB2	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.674	2026-03-15 10:23:43.896	6009-6007	Dell PowerEdge R630	\N	1C-07	B91HHJ2
6f9fe5e0-ab8f-46b5-9da8-5bc841bf38af	EMC_SANSWITCH_1	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.686	2026-03-15 10:23:43.914	6009-6012	Dell DS-6505B	\N	1C-07	BRCCCD1912N09C
ff754d0c-0150-4c33-aa9b-f2cb9818f85e	EMC_SANSWITCH_2	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.695	2026-03-15 10:23:43.931	6009-6011	Dell DS-6505B	\N	1C-07	BRCCCD1912N08B
76463b47-6457-4670-886b-7c3b6f50f212	EMC_UNITY_2	STORAGE	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.706	2026-03-15 10:23:43.951	6009-6010	Dell EMC UNITY 300	\N	1C-07	CKM00171501646
e310db70-1693-46f8-bb53-9ec17ccb4e29	EMC_UNITY_1	STORAGE	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.716	2026-03-15 10:23:43.97	6009-6009	Dell EMC UNITY 300	\N	1C-07	CKM00171501201
91d29c04-c9af-4e1f-b1e2-c42ea128ea5d	trd6801esxi1	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.727	2026-03-15 10:23:43.986	6801-0001	Lenovo ThinkSystem SR650 V2	\N	1D-04	J901AB0M
fc60e061-454f-4765-9910-119407e598db	trd6801esxi2	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.74	2026-03-15 10:23:44.009	6801-0002	Lenovo ThinkSystem SR650 V2	\N	1D-04	J901AB0P
97700c8a-d55a-467e-a898-ecc3a9ab4914	trd6801esxi3	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.752	2026-03-15 10:23:44.027	6801-0003	Lenovo ThinkSystem SR650 V2	\N	1D-04	J901AB0L
1f33c13f-9160-4c02-96b4-1f17f89f55cc	trd6801esxi4	SERVER	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.765	2026-03-15 10:23:44.046	6801-0004	Lenovo ThinkSystem SR650 V2	\N	1D-04	J901AB0N
0437d7fa-64bf-4c32-92cd-c0a8f88450d1	API-SANSW01	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.39	2026-03-15 10:23:43.446	6303-0003	HPE StoreFabric SN3600B	\N	1C-04	CZC014WXEG
c79a1302-5e8d-4bb7-8ba1-422d60e5f236	API-SANSW02	SWITCH	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.41	2026-03-15 10:23:43.476	6303-0004	HPE StoreFabric SN3600B	\N	1C-04	CZC017WYH8
ec0de072-4f09-4179-b9d0-e304274d4d97	6403SANSTTRD160	STORAGE	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.422	2026-03-15 10:23:43.493	6403-2001	HPE Primera A360	\N	1C-04	SGH105TNRQ
4f1c60f4-8355-41c4-bda2-05b0eb163afd	API-3PAR8200	STORAGE	\N	DC	\N	\N	ACTIVE	\N	\N	\N	\N	\N	\N	\N	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	2026-03-15 09:59:41.436	2026-03-15 10:23:43.518	6303-0002	HPE / 3PAR StoreServ 8200	\N	1C-04	7CE022P0TB
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."AuditLog" (id, "userId", action, "targetId", "ipAddress", details, "timestamp") FROM stdin;
91f31fb3-f8df-44fa-9c2a-d59262f0d391	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	CREATE_USER	e7007eff-58e9-458e-90eb-04094b20f8ec	\N	{"username":"usesr1","displayName":"user1","role":"EDITOR","source":"admin-create"}	2026-03-16 05:27:24.89
5c5ed1d7-ce34-4d93-b27b-b20033921157	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	CREATE_USER	ec0b5714-7496-496d-b455-3027d58e7fde	\N	{"username":"user2","displayName":"user2","role":"VIEWER","source":"admin-create"}	2026-03-16 05:30:45.503
d75a1722-ed9c-46ff-b77d-6134ffd98ad7	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	CREATE_USER	921cc718-bc60-4959-b34f-532db9644e74	\N	{"username":"test1","displayName":"test1","role":"VIEWER","source":"admin-create"}	2026-03-16 05:31:22.375
341a2d7a-0ff9-42b4-9fa4-c24e409588ec	ec0b5714-7496-496d-b455-3027d58e7fde	CHANGE_OWN_PASSWORD	ec0b5714-7496-496d-b455-3027d58e7fde	\N	{"source":"self-service"}	2026-03-16 08:32:49.921
c6758f46-7600-42e4-a486-16ab1d3cfcb5	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	RESET_USER_PASSWORD	e7007eff-58e9-458e-90eb-04094b20f8ec	\N	{"username":"usesr1","displayName":"user1"}	2026-03-16 08:39:42.413
81f85189-e676-460d-939a-7c09b6ed9f3d	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	UPDATE_USER_ROLE	ec0b5714-7496-496d-b455-3027d58e7fde	\N	{"role":"EDITOR"}	2026-03-16 08:58:56.833
b7728d05-9934-4cde-aa93-d5a5315b034b	b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	RESET_USER_PASSWORD	ec0b5714-7496-496d-b455-3027d58e7fde	\N	{"username":"user2","displayName":"user2chang"}	2026-03-16 09:01:59.166
\.


--
-- Data for Name: Credential; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."Credential" (id, "assetId", username, "encryptedPassword", "lastChangedDate", "createdAt", "updatedAt", type, "manageType", version, "nodeLabel") FROM stdin;
43279647-4a0c-4d2a-a7fb-ff997690b9f1	0437d7fa-64bf-4c32-92cd-c0a8f88450d1	admin	ed223fefbe0fd04f5d921b0fadffa04e:33b3a5c07685c75e:9e00d149fd72f0a7197358791607bacd	\N	2026-03-15 10:23:43.446	2026-03-15 10:23:43.446	Management	WEB/SSH	Fabric OS: v8.2.1c	\N
f8f76b53-25a3-428c-a6aa-abd2ceec2a8d	c79a1302-5e8d-4bb7-8ba1-422d60e5f236	admin	666133fc059e26fdf7eb0d05d0cbf4ba:d75c4c5521f0b81a:e7531cdb2b151631c90c4798d11050e4	\N	2026-03-15 10:23:43.476	2026-03-15 10:23:43.476	Management	WEB/SSH	Fabric OS: v8.2.1c	\N
d3a5ba44-f9ee-4c61-9843-b2ce0c85652c	ec0de072-4f09-4179-b9d0-e304274d4d97	3paradm	f5ecc62ea7ef9a7a8e0b51afb7ae4615:04e9bbc401cbd7900824be:02bd6d26a4de0d756dbc4098c7278fdd	\N	2026-03-15 10:23:43.493	2026-03-15 10:23:43.493	Management	WEB	4.2.2	\N
4e3662c1-f698-4ebd-b740-e3b5bba5c239	4f1c60f4-8355-41c4-bda2-05b0eb163afd	3paradm	6bdec4f82bf8240ff8fd23c1ec8166f1:253588012c7d4a4c:6fbe93b827978cfebd7437260913cc66	\N	2026-03-15 10:23:43.518	2026-03-15 10:23:43.518	Management	SSH	3.3.1.410	\N
42fb953c-65e2-47f3-acd1-a80f360fd282	4f1c60f4-8355-41c4-bda2-05b0eb163afd	3paradm	77a550617aed5e349c6c8db6ae0b8052:9f68dbc6660cf9f1:21f097781f634200fa1959109ac0fc87	\N	2026-03-15 10:23:43.518	2026-03-15 10:23:43.518	Management	WEB	3.3.1.410	\N
b6c6d081-b081-4db5-8805-0c1cd3fc32c8	69591373-df0b-4d8d-8347-f838b4d86daa	root	b9466daa9738c949daf2c02e0da9f450:1e62da096dce1bba:07144d7f5943bf3475b8c6d70b2698ba	\N	2026-03-15 10:23:43.55	2026-03-15 10:23:43.55	Host	WEB/SSH	Oracle Solaris 11.4 SPARC	\N
c9a026e0-c27a-4cc6-8c0c-59e10cca08e4	69591373-df0b-4d8d-8347-f838b4d86daa	root	e7cccf6fdf2c4cafc048a2b04634052b:292f96aea93fb6de42:fd6b7070e1ccc6a8e8a407b46416c812	\N	2026-03-15 10:23:43.55	2026-03-15 10:23:43.55	Host	SSH	Oracle Solaris 11.4 SPARC	\N
18afabdc-2090-48c9-9c93-5fdc01291410	69591373-df0b-4d8d-8347-f838b4d86daa	trdroot	7657fe8b9fff6fbcd19dbc2e88eb1ed1:b44f6317cce77c14:44a523480001bc1bf1c2cf1a3e11c471	\N	2026-03-15 10:23:43.55	2026-03-15 10:23:43.55	Host	SSH	Oracle Solaris 11.4 SPARC	\N
8726ef2b-2deb-4059-8a83-4e3d08827e75	c75887d5-a291-4740-9677-91d6c10a0f67	admin	f02e42983e1913cf24aa50e0b6f1cfcc:64ebfa2c72ebcfb6b5f08f:afb2e0000a2ceb99b6cc65079091af6b	\N	2026-03-15 10:23:43.576	2026-03-15 10:23:43.576	Management	WEB/SSH	Fabric OS: v8.2.1c	\N
3dea0c0f-0aaf-4f69-95ac-7640e7042a63	ba41ac88-9a9d-4a25-b2f2-a02e4bb53a4b	admin	396f158c136550152c27bbe1198262ce:af0e6e2f2d89bbb5a82323:b5573836269ad198099ce42a4210ecd2	\N	2026-03-15 10:23:43.594	2026-03-15 10:23:43.594	Management	WEB/SSH	Fabric OS: v8.2.1c	\N
dbe5a076-faa0-4ecd-bb03-b8ecce962af9	a49476fb-857e-4af0-8fef-e5d07776c74c	administrator	79158633ec4d36e6fe58b63bc3e7db39:7ab17c1511ed335299f119:e9b128b39af9d00e1bdf53bb0bfbdafa	\N	2026-03-15 10:23:43.611	2026-03-15 10:23:43.611	Management	WEB/SSH	iLO 5 Version 2.31	\N
ac22bf02-0ff4-4aac-ae70-8b138aede573	a49476fb-857e-4af0-8fef-e5d07776c74c	root	79d40f4de47455410b7e3e9bba2a2f1c:d6a3e86e49f1806febfc98:026d111199b5a83defac23f1024bbe58	\N	2026-03-15 10:23:43.611	2026-03-15 10:23:43.611	Host	WEB	ESXi 7.0.1	\N
212693e3-eaac-4c4c-b2c3-7ce9d6e8662c	f4e354dd-abbf-4166-8d95-c13b6d5b042a	administrator	568478b9c6324a4608541c9edee6811f:f0a6b71914d358cafacc6b:052cb85cddceab061d7d430fdbc53dea	\N	2026-03-15 10:23:43.634	2026-03-15 10:23:43.634	Management	WEB/SSH	iLO 5 Version 2.31	\N
b73d84f8-0d68-4d51-af39-80518d35b4c5	f4e354dd-abbf-4166-8d95-c13b6d5b042a	root	992ed4abc382f146a7a50f88a90b03f4:7ff735c66abac3a0ac6f63:fb77170cc7cdcfa36eb2c2a00cd6648b	\N	2026-03-15 10:23:43.634	2026-03-15 10:23:43.634	Host	WEB	ESXi 7.0.1	\N
b3d8478c-9d08-45c9-a8cf-e4f1c1e8208f	9bf3d14a-3b85-4cfa-956b-e23c56216a9f	administrator	0e6c0a3ac9650b1ea4382964494e0151:4706600fd37be15331a373:83888961c145c1b97d32c6d7f07cc7ce	\N	2026-03-15 10:23:43.656	2026-03-15 10:23:43.656	Management	WEB/SSH	iLO 5 Version 2.31	\N
2ea3e78c-0117-448a-bc1a-d52f94a697a0	9bf3d14a-3b85-4cfa-956b-e23c56216a9f	root	8ba2228c1d1977a0473201c829b32fd3:2833b476d4123acc0268b3:7e782fad5e462b4ecee5f0e685c86d9e	\N	2026-03-15 10:23:43.656	2026-03-15 10:23:43.656	Host	WEB	ESXi 7.0.1	\N
5c0e1f95-b80f-4e67-b5e7-30c90ede1d07	552145d5-a5db-4034-81f1-8798aa2e38cf	administrator	fb802430f4ea0c5dd64eecb107cc9679:4739af10a4d560a349665d:f96d43fe5f3686d47c40428bc11a3573	\N	2026-03-15 10:23:43.679	2026-03-15 10:23:43.679	Management	WEB/SSH	iLO 5 Version 2.31	\N
2b699e7b-69ee-465e-bc62-4855050b0856	552145d5-a5db-4034-81f1-8798aa2e38cf	root	e7265551c33002c0bdaa617881b6d53a:e7f11dc454ab6c401690e7:8c804dada0436aa4f83a943453e2afdd	\N	2026-03-15 10:23:43.679	2026-03-15 10:23:43.679	Host	WEB	ESXi 7.0.1	\N
1058635b-9bff-42a8-8e90-c49f198bc201	0c5fb156-0ddb-4850-87ff-170b71543c64	administrator	8f35a0b3bdbb9ad6092b992ba5b042ea:17d5095e2c4b1b502a7feb:5d305339658559a2a4be3c22cd914615	\N	2026-03-15 10:23:43.7	2026-03-15 10:23:43.7	Management	WEB/SSH	iLO 5 Version 2.31	\N
5fad6e26-e31c-434c-a99a-d396b822c4c2	0c5fb156-0ddb-4850-87ff-170b71543c64	root	ab416af7a17a393d5612ea8745d12c5c:b79253b519f9594f674519:7b5f1c4029fe7e7cd822da4e322843f2	\N	2026-03-15 10:23:43.7	2026-03-15 10:23:43.7	Host	WEB	ESXi 7.0.1	\N
f99f8785-0453-473d-8a34-faf10ef07ccc	f83ee8b2-2bf6-48f4-8d78-64c447b6c05d	administrator	208440dabb5b36f6a259a5879c6d5055:86c1e9a058a70d676e813b:8d5d587ade539225b42b6b514caed7a4	\N	2026-03-15 10:23:43.718	2026-03-15 10:23:43.718	Management	WEB/SSH	iLO 5 Version 2.31	\N
24bf9ca1-d131-4b3e-b744-bd0753797630	f83ee8b2-2bf6-48f4-8d78-64c447b6c05d	root	ddfeaf74d00fab6e20939d0883ee32a0:9a21c233aa4684fca92163:957b63dc8436fd23a85e77f41ebd37e6	\N	2026-03-15 10:23:43.718	2026-03-15 10:23:43.718	Host	WEB	ESXi 7.0.1	\N
85ade769-f12c-4b81-ad28-d893ca43e310	ec23fed0-2d89-4dcc-8489-252369a383cd	administrator	f731d1cffed9377499e8d649e56cc0d2:02fd58dbcca11971752137:422ad7b09b6aae8bab1ee3bd6f0eff55	\N	2026-03-15 10:23:43.735	2026-03-15 10:23:43.735	Management	WEB/SSH	iLO 5 Version 2.31	\N
e2353a9e-1e39-4f16-b856-db384013a48b	ec23fed0-2d89-4dcc-8489-252369a383cd	root	df5db0b487046fd3328cf47ca628fc73:43125cadf57b423ab0fa38:75c2f5dbbdaae049158be3cbd877f0cc	\N	2026-03-15 10:23:43.735	2026-03-15 10:23:43.735	Host	WEB/SSH	ESXi 7.0.1	\N
abf5fc3a-9a7b-4301-9b5e-8df4be3c5cbc	4c09e8c8-e6ec-4cbe-a857-f491287f550d	isc-support	ad1028f282b5d6c6fc215f0c8149d6cb:a42458c188e1ac76:0d957fa88450465fa8f5ad064000f602	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node A
43ab4632-2153-4ab6-a747-722640fa90b8	4c09e8c8-e6ec-4cbe-a857-f491287f550d	ADMIN	91f69d1cfc9bbaee5c4736088c0c9e54:b886c2b0f3cf62de:f8b2c8b3f75ece94a96814415ec3db22	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node A
2cc68da5-3393-4632-8989-19221583b555	4c09e8c8-e6ec-4cbe-a857-f491287f550d	root	7e20486e6534f17e45667069faf917ed:99262ba8061a8d0ce373446c6167:3363fce80e55b0fcbeb7759cb74d8a4f	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Host	WEB	ESXi 6.7.0	Node A
d264f0bc-be41-4c59-9b80-cf31e36f2b43	4c09e8c8-e6ec-4cbe-a857-f491287f550d	isc-support	7bdfea1a59cab3086dc9316efd95d2e3:182fcbb584d4f185:bf635334d2e294e2d439ce847ded7bf5	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node B
604d212f-628d-4c84-a097-f09bac06f03f	4c09e8c8-e6ec-4cbe-a857-f491287f550d	ADMIN	c52cdd14466c0e9f5f911e167e626684:52d4a214a8def5dd:91cea6356f432312f6b65f980b710e99	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node B
18cb0ff9-10a8-4a69-91b6-c1c86aa5ec30	4c09e8c8-e6ec-4cbe-a857-f491287f550d	root	5bcc40c81cea40a176789219079821f0:77b0f564173d5399102318ef5c0e:8d206fbd3dc4bfb55aa6cfb40b4b594a	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Host	WEB	ESXi 6.7.0	Node B
a384bc36-efca-48d4-9e3f-c9e7ffbd6eeb	4c09e8c8-e6ec-4cbe-a857-f491287f550d	isc-support	8697ea76ce01bc60163eadb6786d49a5:47279d39c68a48fe:42f52f526cd43e668ca3d6a65438f975	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node C
43bb8a8d-3899-4690-80a3-a526664a473c	4c09e8c8-e6ec-4cbe-a857-f491287f550d	ADMIN	72940619880018fd96d8663d41aa187d:a23e6fedad60ba56:43013eff57975105e156924bd989604c	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node C
4f7b2150-01c8-4d0d-b007-4a93dce28f69	4c09e8c8-e6ec-4cbe-a857-f491287f550d	root	1dc10b3359ad5574fb323856ef6bb328:899135d92eb01d44b9d5339fafb9:0c733e2b0b6d3769c5a3bfb0dddc0422	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Host	WEB	ESXi 6.7.0	Node C
8d4f102f-3155-452d-9097-08acc4cf4332	4c09e8c8-e6ec-4cbe-a857-f491287f550d	isc-support	31fab0edfcf565e80f8426740d7020c5:a6e692fd4aa9bf13:4df113733e9b42e7235f166a48bebc5d	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node D
ba2a1d9c-b989-4107-86e8-c36c70ae62f9	4c09e8c8-e6ec-4cbe-a857-f491287f550d	ADMIN	74416f3694ed635123c1399811bd5153:b918000f691d1687:1a9cf52d0be7473f41a078074ec59cbb	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Management	WEB/SSH	3.65	Node D
fa0f8f05-64c6-4400-8a99-84ee8edc9518	4c09e8c8-e6ec-4cbe-a857-f491287f550d	root	0296fcfe24a309cc1bd704bbc687a6b2:a2c8a9cbda6972b9fa4a2607ca69:2f4c258dc8b53329d971e4c151a89929	\N	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	Host	WEB	ESXi 6.7.0	Node D
490a2cd1-23a4-4471-a107-ba6826731834	f8c97db1-df09-45b5-8011-877ad060eab1	isc-support	3a3bbae2e750cdcf1c0e98ac8f2a56eb:686615bb09c51bc8:498d345b39e7e2ae7535f529e69a8baa	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node A
bb89b77f-f860-46af-befa-8ff19cb2c177	f8c97db1-df09-45b5-8011-877ad060eab1	ADMIN	f278860d68e4afe272108403e217e8f7:51a6da8448560e67:fd16e11032940e5d6947b0f311d9eb6b	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node A
e103053b-01f8-4d1a-8d62-bdafc2daf28b	f8c97db1-df09-45b5-8011-877ad060eab1	root	88646b4d96dc51b1f1a16ef8c2fc08bc:f3fab7e86ebfe6da86354027679c:0b60c31d29c26d31438aa40e2f342bda	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Host	WEB	ESXi 6.7.0	Node A
fe7f2460-b0aa-4fbe-867d-0adc12348827	f8c97db1-df09-45b5-8011-877ad060eab1	isc-support	815671a8a2022ec6a3b9fe81aaa441b4:9637b05d3031f388:d8b10673b81dee18d5b85d62693a14b3	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node B
5f183bfc-f15e-4164-a1c7-8a832f3f0bbf	f8c97db1-df09-45b5-8011-877ad060eab1	ADMIN	b9325b85459e3150ae28256145be27e1:694d15be2434b770:209b1fd708b87d6a60f476c00ec3f4b1	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node B
db9b9758-31fd-4e42-bab4-91c55d7bea60	f8c97db1-df09-45b5-8011-877ad060eab1	root	aa5d39056ba3013915564b8f1194fe75:924130f09833cffe9c0ab6b9bbe3:49496f15c72c944740db4a1c71cd21b2	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Host	WEB	ESXi 6.7.0	Node B
156283a5-9737-458b-8043-2be52b4af89f	f8c97db1-df09-45b5-8011-877ad060eab1	isc-support	455ff2278489a057cc577e7505af6848:f29180315ce428dc:c8543f7036dfdda76f3c359b9aa693e7	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node C
f1157bb0-2798-4398-883a-fc785b71ddb1	f8c97db1-df09-45b5-8011-877ad060eab1	ADMIN	0adcf85e2b16ceea6d5bc68c894c7ed8:549ee6b3f4b864af:baa6e616be45fa4b2e20276e56fdac45	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node C
5dac6418-69e7-4b03-bf6c-c0c8e03bbcbc	f8c97db1-df09-45b5-8011-877ad060eab1	root	72388b3e26344e2b264c503dbd230efd:8fa7acb403f84d4182b48dab402c:e1794bed60ce5343e8282400b0b0f36c	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Host	WEB	ESXi 6.7.0	Node C
7c2ede68-7d06-46a7-9e5b-f8bfeb1551f2	f8c97db1-df09-45b5-8011-877ad060eab1	isc-support	ec7801d8ce7d4ba1ac51798a222bdbeb:f6f42ee900940be3:8fb13207ae438212f9d0cb2e29da7e33	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node D
f4662362-4f44-46bc-b233-36753c6c2b86	f8c97db1-df09-45b5-8011-877ad060eab1	ADMIN	8285c433f40c224f59a2fc1319fe477f:1b8b6839556444f4:f165098a8c8022105575612f70b5896c	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Management	WEB/SSH	3.65	Node D
50cb8ae8-a38d-4f8d-8a56-2a7ef7c1a188	f8c97db1-df09-45b5-8011-877ad060eab1	root	f13eca4f10dc91b6e1e0b2a90c42bc1c:7c0ff45b61132ee80895f5e78341:7d6069331c53e735a07ebe2558f41f52	\N	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	Host	WEB	ESXi 6.7.0	Node D
74d8cbbc-b753-434a-8ff1-38e786a4afd0	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	isc-support	d66a23e64ce3d403017b178b846e11c1:b28c6f32d265e636:ed500f6c1c865d9b84c6a93f86ba4def	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node A
52bd2dc9-42ea-4ca7-967e-2b2952a1fed2	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	ADMIN	7b8a53bd8e70667882b6dcd6f101ae28:2915af44ae08b12e:37bec63fcb05f362524c706015b28ded	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node A
3388d7b4-5591-43d8-962b-d7486c6d51c4	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	root	49f76b64a7f44e6c1bbee19af80f3b40:7c3220cf5557566a8b4eb4b77c6d:e9dd63287d6e348ced779ec685dd4f63	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Host	WEB	ESXi 6.7.0	Node A
ab9aab3b-9ddb-4b83-8b4a-8e2ce6bd38fe	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	isc-support	244be4bcde631d028dfc249db1624c11:22f3ddf700dc3954:a8d07fa538937a2337c1eeff94f81c77	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node B
6664cad3-b979-4e36-83c7-758eaec3d106	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	ADMIN	38da17e62cbbf031c3ac77046e0886a5:deabc3206fc898c1:21e3543453a2db2ca45f166dae5cfb12	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node B
0f49fc2f-ad4b-4958-94ce-1c3a7040ed7c	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	root	0b3cb7570ef3a1f67c155993eec2c61d:26b4eabfba1fe515a9578a8498d3:0a9b7a8549f42b88b4062134ee8a0c1b	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Host	WEB	ESXi 6.7.0	Node B
1b34977a-ad7a-4dee-8dcf-060926c37ce6	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	isc-support	28ad5df1c0b92d7a111c071e1f5af431:519d04ad112afb04:a7bfbbc497862abf2f8da5fb5fd36257	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node C
8464bbc5-e072-4651-8d91-a20c61826d95	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	ADMIN	f5a8eca36a443eb2b24e684617e0f250:71acd8102b2e6fd1:e0fc45a3a41e7a1a7377ddafb408d6e8	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node C
73f8f5aa-1139-4280-b9fd-23ead11b6f93	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	root	0ce7ade275c1d22f5dd07e355cb6aa70:5d5b6634b16f373e9550d44f6d70:90a5047dc79dd5c699e6c7cfe8e1776f	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Host	WEB	ESXi 6.7.0	Node C
bb8e94d8-9c56-4815-a96e-6d06660abbea	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	isc-support	8e97d414c91644ce80b7c46ad19595f4:51401b1c24a2a787:9aa7d36cd61f41e7102554a755ab25f3	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node D
df37865c-795e-4af1-ba5f-14918215f9e0	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	ADMIN	f3c8847f9f5502a2b449dc71dfba1e05:26f7d75defe3c8a9:42ce2827ead3f49accadf42577bff671	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Management	WEB/SSH	3.65	Node D
6461408a-6068-4599-ac94-e7946c881ec5	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	root	97a466a314587410473ba6fc0e297583:92b2920abe9364b57bafb01ede4a:2ebd1c86ece23b799274ed64eab69306	\N	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	Host	WEB	ESXi 6.7.0	Node D
710d2edb-7d9c-48d2-ab0a-e4b7e09517f2	805f1749-7f0b-402b-99b1-a0519836c627	isc-support	cebe13ef4753db3f44c12e2c8400e6f2:7ba50f1ed29a5775:e75b2a6cf4d41eee51b83cdcd47fd784	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node A
c2e1782d-fc95-4668-903b-70b668e5bb2c	805f1749-7f0b-402b-99b1-a0519836c627	ADMIN	553fd80d9f51f5a3ddc33cb0d1c48476:0dd27e0e74a33766:35e27a7fecca8baa1aee905e9feee58b	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node A
24ce79d4-be55-4683-bf9a-ca7acbcb696a	805f1749-7f0b-402b-99b1-a0519836c627	root	47f583db4d39ea57fb765db055fa6edc:b4198d4f50e96d97d20234f4c899:1d63ac8de7866410d0ae868ca682c498	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Host	WEB	ESXi 6.7.0	Node A
9bcbd9d1-6e14-4725-a0bf-d62b8fa62dfd	805f1749-7f0b-402b-99b1-a0519836c627	isc-support	5ce2396e5225ace97d302f37a04583a7:d054a694b467847f:7bfbab940fed8cc44abf0960c06c716e	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node B
c1d6d660-a903-48a3-8a0b-99913952f109	805f1749-7f0b-402b-99b1-a0519836c627	ADMIN	a470ad55eba062c1fc9fb1853c9f221b:7ab425680f925bcd:47638ad02538697907606e3951cda0e4	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node B
8d68e994-94dc-48d3-9297-ee5939037e55	805f1749-7f0b-402b-99b1-a0519836c627	root	b845e2996d17a472107bebbd13a8af4d:adafab95c076d524eb71ba9a2fec:a4665e991441ddb0a288358962b47096	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Host	WEB	ESXi 6.7.0	Node B
c3e710e5-f18a-43f1-af7a-16be796cee1c	805f1749-7f0b-402b-99b1-a0519836c627	isc-support	94eff485a677491f6ca6aa58a02a0554:17dc13a6e1d3b6a3:058ae7552597521a2a7e52547acdaf1b	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node C
a28c9086-a169-4181-9c37-0caffdb4dd34	805f1749-7f0b-402b-99b1-a0519836c627	ADMIN	3aa674d65196ea5a3eec7a3a0a43bec4:995a436bbf9185e1:f23681e97cf9b7867dca2d661971a9cb	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node C
e916c4f9-ff44-4095-bb1e-3090e598f17c	805f1749-7f0b-402b-99b1-a0519836c627	root	a9f91e431295064f838fec9e66938db9:fd80d2005165c909b600782c5d68:ef142148a30c9598b4a0f38d493c7d3a	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Host	WEB	ESXi 6.7.0	Node C
bdc296f6-10d7-4463-8190-4499abe1cb87	805f1749-7f0b-402b-99b1-a0519836c627	isc-support	4ce7f37c0eee4631ebeda586917e2278:ef3c55e25d11bb9d:b201797da542b552d4159960d3838933	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node D
c6915d52-2bef-436c-9e16-e5d03266a7c2	805f1749-7f0b-402b-99b1-a0519836c627	ADMIN	be29b91ae072af76bac909105a52d6bf:677530a848306963:f3c6f8f63a045562069c338500341b09	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Management	WEB/SSH	3.65	Node D
50d9738c-238c-4e50-9d73-d5cdce87db9e	805f1749-7f0b-402b-99b1-a0519836c627	root	abe467904a67924920e1b479ef587ff5:60e77fb319b405971b8a4e641527:7e41764d77c520da5bc49f021b54414d	\N	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	Host	WEB	ESXi 6.7.0	Node D
0dc1a666-1205-4c63-8b80-5c6bbff96de4	ffba346c-9eb3-4fa0-93ed-5e98495521df	root	5fc3b51d201035aaea71b9ddc055e318:f4a69d9cda2c0a47826250098a:ef41d780746951872afaeb6ae4093a56	\N	2026-03-15 10:23:43.842	2026-03-15 10:23:43.842	Management	WEB	2.41.40.40	\N
2fd62016-7426-44bc-a69e-bc91f47375ca	ffba346c-9eb3-4fa0-93ed-5e98495521df	root	116a91cdb12e91fa3ab183fbbc50ca61:f3324c64662635cf8ac01bc612:5e1f2aa6e733e5544bdc0ed849e43707	\N	2026-03-15 10:23:43.842	2026-03-15 10:23:43.842	Host	WEB	ESXi 6.7.0	\N
d027f24a-af46-478e-94a4-3d388306dab5	3aef4e44-5ca7-4c0f-8561-a801babfdc5d	root	2354eeae0e224e7b8b6a03669c1aa7ba:bcface76ba1af98c9d09cd5c6d:e60574dadbec6684e5bb8f98f831495e	\N	2026-03-15 10:23:43.859	2026-03-15 10:23:43.859	Management	WEB	2.41.40.40	\N
a4b6ae6e-ac7d-47b3-9e55-c6317604050f	3aef4e44-5ca7-4c0f-8561-a801babfdc5d	root	9a6531080945046ef9ecc1534cf4828c:3bca412a528bfd34d6985fdebd:bc7cda490b045bcd08a18d21604d8b9e	\N	2026-03-15 10:23:43.859	2026-03-15 10:23:43.859	Host	WEB	ESXi 6.7.0	\N
cc155161-c29c-4471-997d-8930c3ca40be	74592ab5-0bf5-4074-ba32-58a1703fef71	root	360b294336e28de6327629cc86405ed0:ac01b1a445b977635af57a9d37:1d59f637a83c02ab3e3893db1032adff	\N	2026-03-15 10:23:43.877	2026-03-15 10:23:43.877	Management	WEB	2.41.40.40	\N
50c0e33c-8a00-4b30-a8ec-f5aebd5089c3	74592ab5-0bf5-4074-ba32-58a1703fef71	root	415717757278e74d80c0c4c132f0fb46:2415722731f81467cd5bf4d1e5:51b487b4a3193724922aa0751b53b456	\N	2026-03-15 10:23:43.877	2026-03-15 10:23:43.877	Host	WEB	ESXi 6.0.0	\N
1d8ce79f-a381-4e03-b9c6-18ae026f41f2	fc3147c8-72f6-4e1d-b6c1-11041fee4d9e	root	4b6a209d0768585acc50910aa7af0242:6fa95dd74262ce8ab88c897130:c6c8436c1d004bb2dc62578f65394fca	\N	2026-03-15 10:23:43.896	2026-03-15 10:23:43.896	Management	WEB	2.41.40.40	\N
519ae774-5203-4eaf-a4ce-c12669e63a23	fc3147c8-72f6-4e1d-b6c1-11041fee4d9e	root	9139c1954daf0ce8a7bbdf93b3f24cd6:6c5f860a5284ef2f763192732f:571de59812842c9c14c8c03f0857d806	\N	2026-03-15 10:23:43.896	2026-03-15 10:23:43.896	Host	WEB	ESXi 6.0.0	\N
330d8180-edc5-4bdb-92be-ab657d97727b	6f9fe5e0-ab8f-46b5-9da8-5bc841bf38af	admin	d658e4accca564a5353c0ca6e73a898f:b56a26f0cf19b565d30c575030:7e1ae14297110400da26b95a0b84861c	\N	2026-03-15 10:23:43.914	2026-03-15 10:23:43.914	Management	WEB/SSH	Fabric OS: v7.2.1d	\N
f5fe64e3-0469-4f49-8277-24315158a44c	ff754d0c-0150-4c33-aa9b-f2cb9818f85e	admin	486cac50ecbb0a929e4858d1136cdd2c:12268cbf271519c5563ef73651:f483cdc38b4c1afba0462c60729276da	\N	2026-03-15 10:23:43.931	2026-03-15 10:23:43.931	Management	WEB/SSH	Fabric OS: v7.2.1d	\N
98031c27-6c9d-440b-a5a7-5f825711540d	76463b47-6457-4670-886b-7c3b6f50f212	admin	20d8835b66ebb086d972a83c29d33ed2:a6484f5d9034133d6ed3ce61:559ac8526700eb7fb3dc618a8be056f1	\N	2026-03-15 10:23:43.951	2026-03-15 10:23:43.951	Management	WEB	4.3.1.1525703027	\N
04755d65-b095-4084-9168-07364fa69aa5	e310db70-1693-46f8-bb53-9ec17ccb4e29	admin	32ad1fbbfee4e80ff70849b152683d7f:5dbc9db1f1100ebb62bab43e:a39a3be59c672321fd83558960e89767	\N	2026-03-15 10:23:43.97	2026-03-15 10:23:43.97	Management	WEB	4.3.1.1525703027	\N
5d653c3d-34b8-4b91-8733-1ac91d6fddac	91d29c04-c9af-4e1f-b1e2-c42ea128ea5d	admin	8a77d296de1991ed48ce00de2d482520:09f13f7dde09a601ebddc514:c9f8e1e4b8ed14a33b9102a016182262	\N	2026-03-15 10:23:43.986	2026-03-15 10:23:43.986	Management	WEB	AFE126I / 3.10	Node 1
7a85a3f0-efca-4dbf-b03a-783da46e586d	91d29c04-c9af-4e1f-b1e2-c42ea128ea5d	root	4c17363e4bc0ab5bcc115fd354dd0553:e972d26c8b58d5ff7009bc91:5c7a566def5d6ccf2b7a60d8536d1ff3	\N	2026-03-15 10:23:43.986	2026-03-15 10:23:43.986	Host	WEB	VMware ESXi, 8.0.3	Node 1
509e41be-8ff5-4852-95f9-050614d13b51	fc60e061-454f-4765-9910-119407e598db	admin	4049b95734028feef5470af26d3fd40d:de556f1fc1764b8c514cc6a7:cd320d060f0e0c14edcee581bcefb3dc	\N	2026-03-15 10:23:44.009	2026-03-15 10:23:44.009	Management	WEB	AFE126I / 3.10	Node 2
7bcd93b3-418a-4557-9e4b-d7ac3508e8e7	fc60e061-454f-4765-9910-119407e598db	root	6151c2170b2bc742fa3db459ea1874a4:81d343a154b90b0f29190661:d4f956c5354081a896c7c7144d102392	\N	2026-03-15 10:23:44.009	2026-03-15 10:23:44.009	Host	WEB	VMware ESXi, 8.0.3	Node 2
ef38c5c0-25c0-4ad5-b009-c6f851e283bd	97700c8a-d55a-467e-a898-ecc3a9ab4914	admin	61eb65c2d91eabce9263502d506c680d:3a4657fba6912beb9b63d532:367c8c2d4750b8de1230d4bc7099c37e	\N	2026-03-15 10:23:44.027	2026-03-15 10:23:44.027	Management	WEB	AFE126I / 3.10	Node 3
5cb7f3c6-0bd6-41c4-910b-9e6482cfb8cf	97700c8a-d55a-467e-a898-ecc3a9ab4914	root	edee50684eb55d05d6f6b3e64677a612:582f91a8cf0eefc567f5eced:74815f50ad346a907c35b7062d06f1a7	\N	2026-03-15 10:23:44.027	2026-03-15 10:23:44.027	Host	WEB	VMware ESXi, 8.0.3	Node 3
eef1e880-358f-4826-94c2-52bc7654c795	1f33c13f-9160-4c02-96b4-1f17f89f55cc	admin	6cc03e78e0f19b2c1800a963bd722d79:bbec177c0b1de9da7aedb001:d187d53a3b974ffa4128a54562930aab	\N	2026-03-15 10:23:44.046	2026-03-15 10:23:44.046	Management	WEB	AFE126I / 3.10	Node 4
745fb176-5dc2-40f9-b55f-0f93135fada9	1f33c13f-9160-4c02-96b4-1f17f89f55cc	root	8ad1fc652c86260a70dbe938ff52f558:ceff4d122554e0b4550fa535:5fe8ec2bd6df5939fa52d8b67a9c5bad	\N	2026-03-15 10:23:44.046	2026-03-15 10:23:44.046	Host	WEB	VMware ESXi, 8.0.3	Node 4
\.


--
-- Data for Name: DatabaseAccount; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."DatabaseAccount" (id, "databaseInventoryId", username, role, "encryptedPassword", privileges, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DatabaseInventory; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."DatabaseInventory" (id, name, engine, version, environment, host, "ipAddress", port, "serviceName", owner, "backupPolicy", replication, "linkedApps", "maintenanceWindow", status, note, "createdByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IPAllocation; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."IPAllocation" (id, address, type, "assetId", "createdAt", "updatedAt", "manageType", version, "nodeLabel") FROM stdin;
4cbab589-8df3-465b-ad5b-016c5c1a26ae	192.168.13.249	Management	0437d7fa-64bf-4c32-92cd-c0a8f88450d1	2026-03-15 10:23:43.446	2026-03-15 10:23:43.446	WEB/SSH	Fabric OS: v8.2.1c	\N
5eaef7c1-b2be-4d03-b406-4b7b0afe7f50	192.168.13.250	Management	c79a1302-5e8d-4bb7-8ba1-422d60e5f236	2026-03-15 10:23:43.476	2026-03-15 10:23:43.476	WEB/SSH	Fabric OS: v8.2.1c	\N
b3c400fe-bfa1-46e8-8a0f-a8be61cb2a1b	192.168.41.160	Management	ec0de072-4f09-4179-b9d0-e304274d4d97	2026-03-15 10:23:43.493	2026-03-15 10:23:43.493	WEB	4.2.2	\N
d8fde81c-8c02-4092-b9ef-54b1f6946c10	192.168.11.63	Management	4f1c60f4-8355-41c4-bda2-05b0eb163afd	2026-03-15 10:23:43.518	2026-03-15 10:23:43.518	SSH	3.3.1.410	\N
007dd60a-e0dc-4bb2-ae52-8df5497fa740	192.168.13.61	Management	4f1c60f4-8355-41c4-bda2-05b0eb163afd	2026-03-15 10:23:43.518	2026-03-15 10:23:43.518	SSH	3.3.1.410	\N
24309caa-733a-4884-83eb-e25d182dc986	192.168.9.93	Management	4f1c60f4-8355-41c4-bda2-05b0eb163afd	2026-03-15 10:23:43.518	2026-03-15 10:23:43.518	WEB	3.3.1.410	\N
c63c239f-c314-4d38-bc6e-d1499dea9a2b	192.168.11.62	Host	69591373-df0b-4d8d-8347-f838b4d86daa	2026-03-15 10:23:43.55	2026-03-15 10:23:43.55	WEB/SSH	Oracle Solaris 11.4 SPARC	\N
41844f9e-5265-4569-b564-23722dfc6cfa	192.168.13.61	Host	69591373-df0b-4d8d-8347-f838b4d86daa	2026-03-15 10:23:43.55	2026-03-15 10:23:43.55	SSH	Oracle Solaris 11.4 SPARC	\N
4d9098bb-b8fa-4a1c-80b9-826fcf787a87	192.168.41.158	Management	c75887d5-a291-4740-9677-91d6c10a0f67	2026-03-15 10:23:43.576	2026-03-15 10:23:43.576	WEB/SSH	Fabric OS: v8.2.1c	\N
1364e878-7cb3-4b0e-9d15-263c5b01040a	192.168.41.159	Management	ba41ac88-9a9d-4a25-b2f2-a02e4bb53a4b	2026-03-15 10:23:43.594	2026-03-15 10:23:43.594	WEB/SSH	Fabric OS: v8.2.1c	\N
61ba5836-80a5-4549-8052-e56a458be5bc	192.168.41.151	Management	a49476fb-857e-4af0-8fef-e5d07776c74c	2026-03-15 10:23:43.611	2026-03-15 10:23:43.611	WEB/SSH	iLO 5 Version 2.31	\N
e9e96996-de45-43e3-a35a-e02e3e2ef9ea	192.168.41.161	Host	a49476fb-857e-4af0-8fef-e5d07776c74c	2026-03-15 10:23:43.611	2026-03-15 10:23:43.611	WEB	ESXi 7.0.1	\N
b350d386-a36d-41ff-9727-ef9c0e20eb92	192.168.41.152	Management	f4e354dd-abbf-4166-8d95-c13b6d5b042a	2026-03-15 10:23:43.634	2026-03-15 10:23:43.634	WEB/SSH	iLO 5 Version 2.31	\N
c90de360-0132-4011-87ad-e42ee668da1b	192.168.41.162	Host	f4e354dd-abbf-4166-8d95-c13b6d5b042a	2026-03-15 10:23:43.634	2026-03-15 10:23:43.634	WEB	ESXi 7.0.1	\N
d9666262-efb8-45d1-ad70-708022b84071	192.168.41.153	Management	9bf3d14a-3b85-4cfa-956b-e23c56216a9f	2026-03-15 10:23:43.656	2026-03-15 10:23:43.656	WEB/SSH	iLO 5 Version 2.31	\N
a22c0663-f3b1-4caa-ab49-76cd9f9575bc	192.168.41.163	Host	9bf3d14a-3b85-4cfa-956b-e23c56216a9f	2026-03-15 10:23:43.656	2026-03-15 10:23:43.656	WEB	ESXi 7.0.1	\N
fc01dd3c-9e4e-4945-9ee9-e52a954b09c9	192.168.41.154	Management	552145d5-a5db-4034-81f1-8798aa2e38cf	2026-03-15 10:23:43.679	2026-03-15 10:23:43.679	WEB/SSH	iLO 5 Version 2.31	\N
7d73fe80-9955-42a5-927b-fb66544ecfc4	192.168.41.164	Host	552145d5-a5db-4034-81f1-8798aa2e38cf	2026-03-15 10:23:43.679	2026-03-15 10:23:43.679	WEB	ESXi 7.0.1	\N
2fc544f4-4350-4406-bcef-63eeddc3d081	192.168.41.155	Management	0c5fb156-0ddb-4850-87ff-170b71543c64	2026-03-15 10:23:43.7	2026-03-15 10:23:43.7	WEB/SSH	iLO 5 Version 2.31	\N
accf3cc4-3aca-40ce-9103-265e601b4774	192.168.41.165	Host	0c5fb156-0ddb-4850-87ff-170b71543c64	2026-03-15 10:23:43.7	2026-03-15 10:23:43.7	WEB	ESXi 7.0.1	\N
f7ae47ec-105f-4c32-94f8-9b3ebfc39b1a	192.168.41.156	Management	f83ee8b2-2bf6-48f4-8d78-64c447b6c05d	2026-03-15 10:23:43.718	2026-03-15 10:23:43.718	WEB/SSH	iLO 5 Version 2.31	\N
1357be63-e50e-4c4a-a99a-cefb5fa7984e	192.168.41.166	Host	f83ee8b2-2bf6-48f4-8d78-64c447b6c05d	2026-03-15 10:23:43.718	2026-03-15 10:23:43.718	WEB	ESXi 7.0.1	\N
ebfb2dcf-f605-4929-9418-e7e2838e94e0	192.168.41.157	Management	ec23fed0-2d89-4dcc-8489-252369a383cd	2026-03-15 10:23:43.735	2026-03-15 10:23:43.735	WEB/SSH	iLO 5 Version 2.31	\N
18bf5d24-b097-4a05-a2d2-f820ded4a5a7	192.168.41.167	Host	ec23fed0-2d89-4dcc-8489-252369a383cd	2026-03-15 10:23:43.735	2026-03-15 10:23:43.735	WEB/SSH	ESXi 7.0.1	\N
7cc061a4-697b-4b76-bb4f-9c7892222ad4	192.168.13.161	Management	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB/SSH	3.65	Node A
c3b1d30d-f368-44a4-a8af-bcac375245fa	192.168.13.141	Host	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB	ESXi 6.7.0	Node A
9ec1a1f5-8546-4d0f-96f5-8af137ba54c5	192.168.13.162	Management	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB/SSH	3.65	Node B
fd051ad6-8f14-4a7c-8e96-9fa8ddfdf5fa	192.168.13.142	Host	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB	ESXi 6.7.0	Node B
fcff4e1b-e60d-4c85-9768-a07f2467e531	192.168.13.163	Management	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB/SSH	3.65	Node C
abe8af4a-8f48-4dbe-9779-0c1ebe096b4a	192.168.13.143	Host	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB	ESXi 6.7.0	Node C
7f5883e1-33d7-434b-a48f-394a6c638034	192.168.13.164	Management	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB/SSH	3.65	Node D
9ce02770-8679-403d-98e2-c61ce0a9ff52	192.168.13.144	Host	4c09e8c8-e6ec-4cbe-a857-f491287f550d	2026-03-15 10:23:43.754	2026-03-15 10:23:43.754	WEB	ESXi 6.7.0	Node D
3dd09b48-49ec-4c42-a221-91662c1fb5f6	192.168.13.165	Management	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB/SSH	3.65	Node A
cf4bb098-1125-45e4-8555-97efd3dc426d	192.168.13.145	Host	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB	ESXi 6.7.0	Node A
63276390-f125-4f12-b141-f7a44b552e79	192.168.13.166	Management	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB/SSH	3.65	Node B
46ec9acd-2670-47aa-8307-56a87977d59f	192.168.13.146	Host	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB	ESXi 6.7.0	Node B
b7675424-c23c-486e-b9ec-d7d6bce03131	192.168.13.167	Management	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB/SSH	3.65	Node C
4952f0c8-7662-4083-bf6f-b435a53d4489	192.168.13.147	Host	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB	ESXi 6.7.0	Node C
3ebe65ff-7f95-4554-9a85-24cbd52fa5e6	192.168.13.168	Management	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB/SSH	3.65	Node D
9c8fa0e7-8fa6-47a2-9e92-2f29991591f6	192.168.13.148	Host	f8c97db1-df09-45b5-8011-877ad060eab1	2026-03-15 10:23:43.777	2026-03-15 10:23:43.777	WEB	ESXi 6.7.0	Node D
2b73003d-2281-4cd8-8706-ac093299e93a	192.168.13.169	Management	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB/SSH	3.65	Node A
cc419521-1ef0-495f-a8bd-320967534824	192.168.13.149	Host	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB	ESXi 6.7.0	Node A
d51ae917-5dbc-4d88-8127-d1b73485416b	192.168.13.170	Management	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB/SSH	3.65	Node B
7391ee56-a581-4ae5-ad98-18f523c08029	192.168.13.150	Host	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB	ESXi 6.7.0	Node B
e11896e8-cdf4-4a27-bb8f-b7923a4892fa	192.168.13.171	Management	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB/SSH	3.65	Node C
f0880d14-e6ad-40f7-85f4-a9ac2a96b7f6	192.168.13.151	Host	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB	ESXi 6.7.0	Node C
51158379-f0a7-48eb-9eae-319fcb290cd5	192.168.13.172	Management	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB/SSH	3.65	Node D
59dee754-6d0b-4078-8d2a-3d013051f3ff	192.168.13.152	Host	3aef32bc-eafc-44f2-a0a1-0e2521fa4d15	2026-03-15 10:23:43.799	2026-03-15 10:23:43.799	WEB	ESXi 6.7.0	Node D
fa975f8f-9cbf-416b-a265-5de08a9cf5cc	192.168.13.173	Management	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB/SSH	3.65	Node A
e222f24d-629a-4d79-b551-05dcd5a76fad	192.168.13.153	Host	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB	ESXi 6.7.0	Node A
b1faf2ab-de59-4822-a6ef-7c5cfe73a50e	192.168.13.174	Management	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB/SSH	3.65	Node B
0c70401c-3cc5-4d4a-96d8-c3347f8cada0	192.168.13.154	Host	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB	ESXi 6.7.0	Node B
bea9294d-1051-443b-9f68-17fc30132e48	192.168.13.175	Management	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB/SSH	3.65	Node C
29835974-5163-4ea2-98e5-586e644569c3	192.168.13.155	Host	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB	ESXi 6.7.0	Node C
22e1fc7e-76f7-4234-9bac-aed71f5d9861	192.168.13.176	Management	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB/SSH	3.65	Node D
644299b7-b43f-46a6-9244-013bf01b7253	192.168.13.156	Host	805f1749-7f0b-402b-99b1-a0519836c627	2026-03-15 10:23:43.82	2026-03-15 10:23:43.82	WEB	ESXi 6.7.0	Node D
eec97a82-fc80-45e9-af04-3cf8035f44a5	192.168.13.177	Management	ffba346c-9eb3-4fa0-93ed-5e98495521df	2026-03-15 10:23:43.842	2026-03-15 10:23:43.842	WEB	2.41.40.40	\N
ed5deee6-f382-43f1-b041-bd75135aa527	192.168.13.157	Host	ffba346c-9eb3-4fa0-93ed-5e98495521df	2026-03-15 10:23:43.842	2026-03-15 10:23:43.842	WEB	ESXi 6.7.0	\N
0b96104c-51fe-4e87-992f-7adbecdfdc58	192.168.13.178	Management	3aef4e44-5ca7-4c0f-8561-a801babfdc5d	2026-03-15 10:23:43.859	2026-03-15 10:23:43.859	WEB	2.41.40.40	\N
597b6513-8b97-46a9-934a-bf61a31298d7	192.168.13.158	Host	3aef4e44-5ca7-4c0f-8561-a801babfdc5d	2026-03-15 10:23:43.859	2026-03-15 10:23:43.859	WEB	ESXi 6.7.0	\N
54247aa7-adb4-425f-a46b-0318e0d10bb9	192.168.13.181	Management	74592ab5-0bf5-4074-ba32-58a1703fef71	2026-03-15 10:23:43.877	2026-03-15 10:23:43.877	WEB	2.41.40.40	\N
561f8f38-b03d-46f9-8015-188890b13e7d	192.168.13.159	Host	74592ab5-0bf5-4074-ba32-58a1703fef71	2026-03-15 10:23:43.877	2026-03-15 10:23:43.877	WEB	ESXi 6.0.0	\N
f03544d8-67f3-4291-8494-ad2744cf9e6d	192.168.13.182	Management	fc3147c8-72f6-4e1d-b6c1-11041fee4d9e	2026-03-15 10:23:43.896	2026-03-15 10:23:43.896	WEB	2.41.40.40	\N
293d9325-7677-4b21-8257-96c4137e0be9	192.168.13.160	Host	fc3147c8-72f6-4e1d-b6c1-11041fee4d9e	2026-03-15 10:23:43.896	2026-03-15 10:23:43.896	WEB	ESXi 6.0.0	\N
6ba5648a-5d45-4523-b15e-aea62f6f381e	192.168.13.185	Management	6f9fe5e0-ab8f-46b5-9da8-5bc841bf38af	2026-03-15 10:23:43.914	2026-03-15 10:23:43.914	WEB/SSH	Fabric OS: v7.2.1d	\N
b4a4f2f9-5d9c-440c-a899-77983a1f16d9	192.168.13.186	Management	ff754d0c-0150-4c33-aa9b-f2cb9818f85e	2026-03-15 10:23:43.931	2026-03-15 10:23:43.931	WEB/SSH	Fabric OS: v7.2.1d	\N
86d908bc-2e99-41e8-98ef-8cc94891a9bc	192.168.13.184	Management	76463b47-6457-4670-886b-7c3b6f50f212	2026-03-15 10:23:43.951	2026-03-15 10:23:43.951	WEB	4.3.1.1525703027	\N
38682252-a7be-4f91-936d-e822f07fb0b9	192.168.13.183	Management	e310db70-1693-46f8-bb53-9ec17ccb4e29	2026-03-15 10:23:43.97	2026-03-15 10:23:43.97	WEB	4.3.1.1525703027	\N
05f7082e-e34e-4bec-91d2-ef4de81cceaa	10.1.120.51	Management	91d29c04-c9af-4e1f-b1e2-c42ea128ea5d	2026-03-15 10:23:43.986	2026-03-15 10:23:43.986	WEB	AFE126I / 3.10	Node 1
aed5c46b-4d9b-41d6-8c7c-b13aec25a44a	10.1.110.51	Host	91d29c04-c9af-4e1f-b1e2-c42ea128ea5d	2026-03-15 10:23:43.986	2026-03-15 10:23:43.986	WEB	VMware ESXi, 8.0.3	Node 1
e8ec8d1d-d836-4d2e-934e-322fd7bfb4d1	10.1.120.52	Management	fc60e061-454f-4765-9910-119407e598db	2026-03-15 10:23:44.009	2026-03-15 10:23:44.009	WEB	AFE126I / 3.10	Node 2
99a307e2-a069-4f26-bf8e-1b292a42c01c	10.1.110.52	Host	fc60e061-454f-4765-9910-119407e598db	2026-03-15 10:23:44.009	2026-03-15 10:23:44.009	WEB	VMware ESXi, 8.0.3	Node 2
9630571f-a36c-4cb6-87bc-7b47d3a165ca	10.1.120.53	Management	97700c8a-d55a-467e-a898-ecc3a9ab4914	2026-03-15 10:23:44.027	2026-03-15 10:23:44.027	WEB	AFE126I / 3.10	Node 3
5e6c0b62-c0b1-49e6-8dbf-c25316524088	10.1.110.53	Host	97700c8a-d55a-467e-a898-ecc3a9ab4914	2026-03-15 10:23:44.027	2026-03-15 10:23:44.027	WEB	VMware ESXi, 8.0.3	Node 3
f3d7bc2e-c2f7-44ee-9f64-bbbb30a000e8	10.1.120.54	Management	1f33c13f-9160-4c02-96b4-1f17f89f55cc	2026-03-15 10:23:44.046	2026-03-15 10:23:44.046	WEB	AFE126I / 3.10	Node 4
2a56f667-b23f-4751-a3d9-c6ec22cdb369	10.1.110.54	Host	1f33c13f-9160-4c02-96b4-1f17f89f55cc	2026-03-15 10:23:44.046	2026-03-15 10:23:44.046	WEB	VMware ESXi, 8.0.3	Node 4
\.


--
-- Data for Name: PatchInfo; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."PatchInfo" (id, "assetId", "currentVersion", "latestVersion", "eolDate", "lastPatchedDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public."User" (id, email, "passwordHash", role, "createdAt", "updatedAt", username, "displayName", "avatarSeed", "avatarImage") FROM stdin;
921cc718-bc60-4959-b34f-532db9644e74	\N	$2b$10$QZxtzTPoMdXqlW8qcrCrTOEPFWpCl.zCFnylYu/joc7hToGE2USeO	VIEWER	2026-03-16 05:31:22.371	2026-03-16 05:31:22.371	test1	test1	71ce51fede9ab2b1	\N
b383c36c-9cbb-4c77-876b-1fb2a2b2e3bd	admin@infrapilot.local	$2b$10$BvxAgYtGCNS.U/q4lGN4mO2rM0I0Ojb5b6jSPL7RWziqfOX60rnBi	ADMIN	2026-03-14 11:01:17.444	2026-03-16 07:04:51.642	admin	Sysadmin	8e896e8b6b24ba04	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAACWAAAAlgBxRv7wAAAABmJLR0QAAAAAAAD5Q7t/AAA/+klEQVR42u1dBXhURxcNUJe/LlBBEzxo0OBQiru7FyhQSnGKOxSXUhyKQ4MVdw3u7l5cEpKQkNx/zmTmZXazm+wma9l9+b7zlUKyu3nvnjdXz/XysuPXs6FeFRgeM+xn+MBL/9K+vvvum2QMqRh8GPRr42lfjBBvMCxhIIZIhhYMnk4KIC3DSIZrDKEMYQxPGKYypNQtx3MI8gnDYUEQIJAhuQeT402G1gz3GaIYyAj4ux0MX+vW4xkEycTwUiEITpEiHkqOtxkGi9OCEyJ9+rRUoXwZql6tAmXO7CNJEskwBCeN/uX+BOmokENiBcObHkaO5AxtJTm+//5batSwFh3av5GePbxIQU+uUMDyOZQxYwZJktMMX+gW5N7k+B/Ddo0YwzSCvGIo7OIG/R7cHBFAf8qQIpGvl57hOow/dervqH/frhT09ApR+H8agp9dpdKlikqCPGLIrVuRexOkNEMoSPFijBe9nGNwiqxheNfFSPE+Q2WGuQyHGM4xXGA4ybCdYaz491TWuD8iU9VPulX169WgkBfXDcgh0bhRbUmQYIYiuhW5LzneY/hHEiLkby+K2OJFz0dpBIlgqMGQzEXIgdNiGcMrE4GzigiGUwzdGL6y8LW/EWQjb+90tHNrgElyAA3q19AJ4iEEqSiD8+ejo8nxejcjykKDU+QYw9cuQA4Ez7MkCRAf+PpmpYIF/ahwoXzklzcXZc7kw/9eIQoC6cMM5RjeiOf1m4nvp6pVylN4yG2T5HgVfJN+KFNcvj6yXL66JbknOT5n2C3jDpweIAcQsYO5W2MNSDLU2QE7M0RvhhD5hJ84biidOraDHtw9Q0/un6cbV45Q4J519NfU0czAy1GGDOlUorwUGacPTbldwm3bgu9NmzY1Lfp7mtnT4/L5A5QnTw75umcZPtetyf3IkZyhl0jn0otxjBRbYwgChK1kxBiuEeQFww/OdLWYIf4oDf6n1k0o6tU9s0YcFnSDVq2YSyVL+BufKBsZ0iHeMHrtggwv8D2F2In0+L/zZl97dcA8TiLxegHGr6V/JX1yAP4MD7nxMxKELTckh0TwTINT5BRDaicSJJ8s2sHFiTDjAql4ePcsde/6MzPo71WSXGHwl4YtKuaj5L/36/NbnK/ZuVMb9bXa6RblfgT5kuGgNPzgvxgZdpomSMS2WK4WaiP/cxJBPmE4L41zycK/4jxFJF6H3qXlS2ZS1iwZVcN+xtAAaWGGz0RAz4uAcNPMvdbThxd5zCNe46Eef7gfOd5kmCcNHmnd8E2mySHxai0L4EdqBIliGMfwlhMIArSRRp4tW2Y6e3J3vASROH96LxUtUkAlCTJhPRgqycJgxQplWBB+y+xrbNmwjMU2aeXPo9XkHd2qEmyL7zB84TI9f8K16sMQzrNWI6LjjLjIIRG61CAewc8PQIOjE0jyLsNmaeRlShejuzdPWkwSuFz161VX45LXDLfk600YOyTOn+/V4xeVYN30NpME2+IXIkGEDOovrvKhGjIEaVmrBcz4d1lGEHzfy/kGVfYQhv6OzmyJUySdatR1alflhm8pSdAu0qVzW0qTxiAuoUyZvON0r/BzhWLcK5w4DRnyMvgx5GTIxpBJdAB/jtNFJ5BZWyzDECZs6Swyqs7+QOXErEd03DEzOpVrETmU1O/L2QYkQfV9vKNnRwRJios4gp8GTRvXpUf3LCdJ6IsbNGxIb96EKAmCWsrdGyfM/kzA8tmUPl0atZs3iOG5yH49E0Ar/GOGBwx3RZv8QYaVokW+D0NjhlIMmRk+8lCC9FfiWrQ01XOmW1WU4b78QEFTY6d0LSbJ9lgkQaV9NUM6J5CkrkzNpk7NSNKkLt27Zbm7hYLflInDyccnPTf6Iv4F6L9bp8x+P/qy4qneW4pIUYF/IAi0i2EiQyuGYqJFJpkbk+NDo9EKYJvD41rULBiKMdzVyDGJBeWbE0YO9SQJmW8QkyBwv8RQ35Eul+i8baKeJPXrVqerFw9aTJLwl7fo77lTqGaNSvTn5FH0OvSO2e89fmQbj19QhMT312WuXb261XjbSd06ValWzcpUo3pFqlyxLE9DFy1SkPL55aYsWTLyxkcLyRMkSLONYahIIKSPrwsgiRGkmtFoBQnX/0dHfggUAn9UyfFiQvwZK4uxMzpwV3q2pMvVzZHFREGSZsKt4UZWiRkoKuyWkgSp4pfPrlFk2N14vzfk+XUei+C/OIFAMNRj8OfQF9fp5fNr9PzRJXrI3L07zF27fukQnTu1m7fLr1+ziGZNH0d9f/+Nu4SYL0HKGF0BcRAmXHQXb2LoyVCI4eMkTI731c5xFKgV+9nokFNEjM/W0wqBtiaHEriHBRicJLJOksKRF12QpD7DPWlYxYsXpsC96y0miaMBUoJoNy4fpkOBG2nZ4hk0oF83fgIhEeCdwSxpXoiYZqRwxz5JYgRpL4NzkOPVmuhSg5L4qeKID4GY47k0WtQwwtfbmBwiHkGRUSEHkgBFHJ3XFvHIdwwbVGNqxmISVyWI+aLmHbp59Sjt2bGGpk4aQQ0b1KQCBfKqtRcVYYIsv4sM2ruunDVjdpGV4ZbMooYuEY2xCwxs6JDdkz7sDWozvFZ9PMQeYKvFad34yLEz1twICFndCXURdPhWE7MgUTIWgd8/ZvTAJEcQUyfNnevHeYFyQN+uVKpkEcqcydsUWZBNW8NQCxOOrhbki6G8bZo9Tol+wHJb2sJOkfGaHb0Wtbpk9vwwH4g3OSeLghwjxLzH9sS7VqGLYtVE2jnh1EjJME2dHc/ok4E6dmhFB/dviLMinlQRwmIc1GpGDu9LJYr7m4pfosTDojvD94mdsLSRPaJ7Y6psjMVYxat1Ro2x/xjYEwL2Qnb3RMQwVCORYYrSaiDTEp7mlV2+SusJCDjMwYH5G6Kz96I0DGSJfihdnDavXxpnJsqdgI5lDHV17dKecuTIaipTdodhuChcpnASOVKoXeMggcnGWOaRBM8w8EguM3zrEHedvcnHDH+pp0lC073hG9hx+IdBehdaWm878NT4RNQMXktDyJA+LQ0a0IOLKngCMUzh0X/naOZfY6lUqaKxOgRE8XKko+srIln0q/pwRnnAnJvPXS3DxtgjDN85iiRAK63VRGa2NlsXlAdNNvgF0BH8pYPIgXnxInIkVqJUiSK0f/e/FnX1egIiQu7Q9s3/8ODeqMVfCkz0coQypHCr+qvkeDnLfNe49gBeZ+CdyJOknEMyo4Ik5dT0L04SS92tl3MNPvhtBl9HsFtkZ36X04TRU3/f06D+3XmqVCdGbKCmc+TAZmrVoiGli2mPkTHKVYbaSI/byc7QpTvZWnJo3eOroxtpjTTa9uI0cVR1vazaehL8Z/yBO+odyocOFlXzZA4gR1qRndFcqmJFC9GeHastKux5OjBXf2jfBt6GkybNd8aiFmtEP5itbSwVw39qFpWPc++03Ft59S+zt+GxdNpqObIFBeX+JzJwQn+VWd9wq0HFE0+FifZuKRHxRikx8x0lTw1M892/fVo3fiuBKv+mdUt49d7I7YLoRCfoi9n4BBmuuvOwMf4g3mphfW2GQVYL2OeQE8Qou9BW64kZHt06YtK1mm3wQQ8wfGNncryh6OLyG5kzZzaaO2siz9zoBp9wPHlwgf6cPJJy5shm3M6ymiGLrU4TtIwwZGOYY5AcmhyjnGPuYYxmWsXeUBeZzpDS4YNVyD4xjFbz08YVdz5NOMKgGPijPT+oUEocLJr2+A0sW7YkD8R1l8p2xcdzp/ZQs6b1jDNelxjqQLjbxjbW1GDU4s/oUe5YAfrm6JhYIQdc+a7o33JmEQfSPxsMgvYdMQVBo6zVJHs2k6EJTxT+uCgcfObmTevTtYuHdMO2A4KfXuXNk4qEkazID7HlnIpw6asyPNKC9rmGMQlOFSNbeyoG/Jxe6MQvkIPhmsGkoQjMFT/wCkMGO5IDwglLZTCOQabePTtzvSvdmO17mhw9uJk3SSqFxnBxL763cQa1uSZSqIx74zRB8VohxwM0LbqKmqdkeFMx2aU1NwZNNAjMf7XHvhARjIMca6WqIQaYxv4xiLeU60bsGGBkuVePTmrrChIje2yp2iIKh1M0LbaJ0SfHy3mxGl6reLnaFwSqGRZoRUTDiiZ6ur6yEzmgyP6vzFRhLnz2zPF8zkI3XEe3rtzk1fgcvllVl+usENWzlZ19LfTVtMzWs5gYF6dLKy9X/WIfzkcdsFJglyEo+LliVlsTTYDWlaf0Urmqy7Vx3RLeYq+Q5CZDURuSpKHcJmBUDJziEjFHHB8cU4id1QqoOPK+swM5PhDrC0hq7S5dNF3PVLkIUIXH0JlCEghQFLYFScRU4W4jgpxzBYF0Sz48BuqPKx98ma0zV2KGY2RM20hqWspODp0croULZ/by+ROjoqKvjUjSSAh+yBi3k1dS+BLZhgrKKVLDxuTAeGxHGZBjuGnGtDF6s6GL4uqFg1SyhAFJbkCXzAZ2hsLfBcVL8fNKKl8iq1VAjM8mtzFBKgvJG55WHDywh26ILo7rlw9T4cL5VZIcY/jSBnbWQ8Qi6+C5eHn6F7uo2eX+P5wcbds0pfCXt3UjTAJA5T13bl+VJFj78H4iCYJ2p48cNU/k6uT4VC6okdI8ce3g0OF62L1jtSayJ1zkAbZsS/FkcrwhRj95ldzPLxedOrZTN7okmAKeN3ui2r8VLAQzdCNPJEGgDvhUVsmXLZ6uG1ySnVi8Td1++1ltS8GEp49u5QknBzbHHpX6uT26ddCr5Ekcj++fpwrlS6vxyAJbzpN4EjmwvWmcTOn+WLZknOrpOpIODuxdr7akhAqNZN3orSRIKelaYbUZWhh043IfjB09UBWGgKuVXrd661pJdsqUbs/unXTXys3w7NElql6tgtr9O8GdVOjtTZC2Yq6AihYtSNcvHdaNyg2xc+tKypo1kyQJFPb9deuPnxxfCmkZPhX499zJujG5KdB5jayWsvNxFcNbOgvMk8NLFJB4YI5FM9iX4dh8PRrt9tGiv//k/w0Lvqn3etkRF8/u54uClNpIBZ0J5gnytVxmgwBu2+YVDr9hD+6codKli5E8wSqWL0Pjxgzms+2RYTpR7IE/RvZX077b9Qq7eYIMl9OBLZrV58syHX2zoJtl1KZNMllQrWp5Lh/0+L9zumHbELeuHVMbGqGAWUlng+l+K6hiULp0qXmu3GnNdSd3U98+XfieQFNEwf6Qzr+0oT071+gNkzbCxPFD1eu80Z0XkSaEHMnEDj1+gZo3reeU08NYnxbSNgf3baDfe//K9wEakwXqKVAbxCJPiKrphp64tnhlVBe6ZoV0ZsQQ5EOZuUJLya5tq1xOzBkEwCLNli0a8sKlShTES0X88/On4N2berU/odcYayiU6zpdZ4aXwc5yfmGqVC7Ht8a6snoHslujWWCJWEVdPIM/FyrkR+NZUB/XznQdpnHmxC7uvirrFr7WCfLdN+8wrJdGhvSqs55g1rZvP7hzmm+YrVWjMne3VKIUL1aY5s+ZzN00W3/Wl8+u0oF96+nerZNut/UKKxeUmZF2OkGiJfRDpcj0Uwf78jD0v6aO5jWXVf/MTVDNA7Wajf8uoQb1alAGZQUzZh9q16rCV0rbSlQCn2/MqIGUMWMGql+3utvJHP27eoFaONzv0cG6CM5/lwbVs3tHh6uTgJD58kUXqtAx/CgRKVycFuvWLOQ9RlBbkb9XtqyZmFEPsIkUKtrFy/1Yir9uieKF+YyF/D2QeYN4W1LOrEGlsUiRAuoekkyeHpzvl4Z0cJ/jU7swMGlwePrv2p74BAFOFLhXhQvlM0gPN6hfg86f3pOoyjyyat7e0aOryK7Jv58yaQTJFDl2pSflYL1Pz85qsN7LY08R9ovnkGrsBQvkZe6Cc7St4LLIY73dT83oxuXDdOPKEV7AwgwKquvIYuGEsMalucUMFUt7vBW3C7WVvTvXJPikHD0iuuqM18T+c0lyuIj4+1y5sif5lDOuj+JmHfDILl+RveohDaff7785V3Ujl68WYEOpMUOGtFzOFCuSCxX0ox/KlKDaNatQu7bNaOSwvrT6n3l05cIBflrERRoQYfmSmQaqHlgZgE5W64Pza1S1Sjn+GjidZEX//p3TWpLgp9ZNknzxEq3whQvnU92s1J5IECy72SDrCDu2BDhPUIBh6KBexnv44gU+d6mSRXlHKga6sEra3Mlw6tgOKlO6mPZkRJxirQL9iSPbKFu2zPznO3Vopf09CCg/08L5U92iy/e3X9up17qNx00cYn8Ew3+4AJgJCHnu3NoHns5Ym1Cpwg88WC9YwM8qsgD5WbA/eGBP7p6ZijNuXTvKK+/IbnXq2FoLsC0Fsm0yO7Y6YJ62urlD+xba37vLWPKalfPVa7vY49ws9guXlRegcaPaLnVznj++rPn0CUFGnww8gH5472ys137x5DI/CaxtpQERkDLG6xfIn0cLxOHiyS1PKLK6S28Yslnp02srqG8hoeNpBBkkszuTJwx3qZsDl0UJEmMhR47sFhElV87s/Eloi3kSVO/z5I4mAjqd5WtCkE2+H+a83aUe8ir4phZvCeTwJHK8KTaj8mB417aVLnNjXrDTQ5mVNkmOcePGGi+wjCNOSU1DmNuFwavEfK5L5/ZT3rw5+eutWDpTKxoO7N9Ne6+TR7fbNN2K1v/jh7fS5g1L+UMDwm/YSwgsmDeFu3lYkHrj8hF+wtm6gDugb1f1Wrb3JIJ8xXCSxx9ZMtJ/t12nbwlPZJDWpOuU0ZvWrl1DZ8+eYcFyFotdLgT/0PRKzFo4GCxcsx1bAzSywU1r2KAmScXJxBRZUcTcyR5UkycMo1YtG1ER/wKUPXtmysR+Z2TI8EBQT9XU7M8gq493eh5DFiqUjwb260ZBT67Y7F6sXfm3eh1nQwrKUwjiI5rR+I1wpZHWPr1+NTkDUq5cWdq1aydFRkbS69evqXbtWlbFJTCwYYN70ysbqrPguq36Zx7vBVu2aLrVPwsxDPS+of8J3QRQrvw+gXFXdPt/Gjp8YJPtBqlYnKW8/gGPiUPEtiE+d96kUR2Xyr+XK1dKrHTzoRIlilGbNq1p5coAevLkCalfW7Zs4d9jjQGhvrJqxVybPhDwWihgWvqaTx9epPVrFlJrdkrAZVO7kdUHgm/2LFSmTHHe79WxQyvmynXnMQ4q9ogZRw7vx1uDmjWpS+XLlebxUa0alejOjeM27HK4wwuf4nM9gefhKQRpKm/GAHYsu1K7tVT8y5s3N481njx5TKa+IiIiaPDgQQY9V+aQNUsmzRDRP4UKvTNaapYvmcHbapTskEaIvHlyUp3aVWkUM/xtm1bwmAeZpPhiJ9Qs4J5hZv+RiaxdYslft05V9bPm9RSCDJA3Zu6sCS5DkM3rlxo8UWH8LVo0p4cPH5okSVBQEPXv34+5JhniJAiq20jByv//Z9lsh/9uSAuryzVx7RG3wL3C57l0LpC3m7taNqtv7y7qtWzoKQSZLhvr1q7622VuBjphTbkbnTp14HGH+vXq1Su6evUqBQQEUMWK5eMkCLpsMb8OEbwSxf15Vd0ZotFwlzCQVJ65kdOn/UGXzwe6/G7H2TPGq8mBQZ7S4r42OiuUgacJXeVmDB/Sx0zwmZYCAwM5MaKiouj06VOMNB0pd+6c2s1DJ3C6dGlM/vzUSSM19Y67N086LSmBtO3hwI28EJpU6iFbmbunnOrzsafSE3qwdvM5iWyZefu3q9wMNEyaOwW6d+/GybF69WoWOOaMRaDu3btSnjy5TP7s9s3/6CO1CcT503tVketNbr8qQcj7HOYThDmy0Z3rx5MEQQoXLkQHDhygzJkzal2/iD0KFixAM2ZMpwcP7lO1alVj/Vw6Fsc8ciEdLZxecKsQXEvg/11VPfL540vqyYxdMZ+6O0Ggnniat33nzuFSswujRvQzSxAQomzZMtr/I8U7cuQIevbsmRaXrF69KlbAjnYJZ4/F4v03/LuYbwXu2aMT75RFN3DHn1ty/NalHe8dGz60D03/8w8KWD6HDu3fyF0yiFQg3epMAmWNEXLAEteU7k6Q1AyXZfUXN8BVCIIWCuva3VPTlCmTueuFLxQRFy9eTFmzZlbijxFO/72OHNisLtC0GIiv0AiJav0wFp9hJMEZemXFihaSn+mZ28+GYFGKWChP+fPncanjHLGCqcJZXECgfunSJTp06BDVrl3T4OfRsuIK8j+nj+/U5kgSCyRW2rdtzq+V8ckI8oBEiBts+fmrVP5Rvj8WuWZwd4J4M9yW46fOMBjMdSPeGNS/OxdTmDZ1NC1eMI2mTh7JpwitNZqBAwdQzpw5Yv19R2WoydlxB1LLK1fMoU3rl/DmULhc5n5XFEn9/PLEOyyGuZk1AfP5ciOQpX/frvxURdsKuo9t9fkbN6ytvndOdydIRoa7+GWLFSvklIqyf8w4p0GMgZsbV5u7OahSPzEzIen5k9tVs0PozDXXMzZ16hTq2LGDRb87AugWzRpQrx6/aG5c9uxZeGOlrT4rCq3KexZ2d4JklpOEZUoXd0rAWqd2FZu4G3H57t27/uyymSF0FZsaCMucORONHz+OQkJCaOXKlRa39Bs/aBDwWzstGRcgfKG8Rxl3J0gmhnvRfUn+zplWu3eWNm9YRgHLZ/MZbrhWQwf34tmdpk3q8swTTjc8CRNyokDK/7YT+q2sWVojU6dp06ahsmV/oJ49u9Px48d4jxm+0JxZs2YNq5sx0cCIhkhbft4uhvPpP3pCq/ttuX/QFZfdo9KM4PrK+QN0cP8G3hLer89vVLdONR43mZsXkacHRBwe3XPdHSJqtg6nRJMmjenatWuxes1OnDhBpUqVjJcYvXv+Qn9OGUWBe9bZJcuF01h5v0ruTpAMYsaYrxSwyUUMu0VRT09Q5KMDFPX4EEU9O0FRwZeIXtm2/oBZDrRzo11jxrQx1KJ5A35aGHf04v/RKj5z+liTc+nOfgAgC2Vs5FWqVKL79+/H6ljesGE95c8ft4AF2kHs+Zl/87ATJK1cdQAVkMQW0SLvbaPQVWXo5XxvCp79Pb2ck4b92YdeLs5FIQHFKWxLYwo/PJBeX11CkQ/2UFQQnuz3bBTP3OX9VRvWLuJ+MvSz1DQvThMILdjSH0/0zAtzf5B9MmXoY8f+wWs5wOnTp6lLl86UL1/eeFPf9m6l8bQY5BuxOJ4P7AQlRv089Aa9XJCFgiZ4WYBkFPzXZ/RyUQ4K3VCTIk6O5YShkKs2S6WCLPPnTKJKFctqQm6oGzh7GZCKezdPUnYzNZEffihNjx49olWrVnFiyL/PkiUT+fsXMkuQw4Gb7PqZoXapvF9RdyfIFwzHpOpHYgppkXc2W0gO0wj+83/8lAk/NY6inp+x2cmCCT8oL/7cvgUfUnKlbBbmPswlHhC4L1y4kHLlymGQwh46dAiNHj3K7M9gO5Q9PzOmTpX3zOVh3bwJr7riBAiamDxRJJHASRRxYTaLZ9x75yDipzilikSnMnrKSpYsTvPnz6ewsDA6f/48O0linzz+/vntnpCoUb2ifD8sePXxqHmQfbvWJvzisSdz6L+VuftkC5IETXmPwk/8YbOTJL5gGa4XZIYgm4Nx32OHtvInPLp/UatAhdrWpw8GtyypZTRp0ohu376tBewYGJs5c0asmRdodL0Ktm8/XcmYrcPYXZjGE4ampsgUY0Aix0+jXl5hMUUtCpr0hm1OkjmpKerxYbsVKaFdBdGDls0b8JSxqSEr3iSY25cH+Njbt3XjcharXbEJWfBAsrSugfRvcHCQRpKnT5/GqrAjm2fvh4nUCRDZz1SeQJAu8gJPGDfENsZ3I4BC11Rgp8A7iTxF3mGvZVshO/joEEPwL5w/QYXH6EA5I7Vv15y2MLK8CrZMOggypHt2rOHt61B43LZ5BS1dON2qbuU1a1bz8WKcHr6+2Qz+Ha0lN68csXvVX3mIQEvtM08gSHl5kZGTt9kFfXWXBdunKOLMZArb0oheLs5JwVM/sC5wn/YRC/432iSrBbfpZ2bUKCya0ptKny4VFSvwFdUu9zk1r/Eptan9KTWs/BmVK/YlZc2U0qz7gyr/9D/HxLuubtrUUdzI8TMS1irYt2/flgfpplK9yC6F21DnyxSwYkKpM21j+MATCJKV4QV+6ZIlijBjssPFZWShkOsUFXSeG3z4yTEUtrMdha6tSCFLcvOaCSfPpBTR5Jj8Nq+lhB/ozdPHic1iQUcqo9HwVJrU31D54l/S0E7/o50z36aHW5NT8J5kFLY/Gb0KTMbe24vC2H9D9iaj57uS04klb9FffT+gJlU/oywZU8UiCtQM586aaDYGGDm8b6L7ypDizZQpY+zThbnHRw5utrt7hZXgCqkXeYS6ojpVCNlKh25rRdX95WVeMMRpw6vuT4+z/55kf3chmliJXKOAdQTqEzdb5pT0W7NP6ODfb9ELZviRh7wo6rDlCN2XjK7/+wYnS4USX3CiqW4Q1EquXTxoUiF90oRhvA0dyioouCGorlzpR64Qn5BmRIlfErC+ISGABrDilo7wiD0hQrx6pZSrRBDqLmlU9G1Jw0ufNhV1b/ExXQh4k50OyawihSmAWE93JKd/J75LtZhbphIFVfwDe9fHGcjj3xC/oNcM47QXzuzl0qU47erUqsK3DFsSI0FkzlF7SPDZlPdu7uUpX+yX7S1/cbgC7kAOnB7169XQ3KmJPT/kblNiiWEKIMrcwe9THt+vlRpGdgrcuy5B2S58dmj1QrEdpwM0k83Jkvbq0cku+99NERq7Y5T3L+hJBPEXI5S8vdw9lr6cYTGVf3SLiXcqesKM2B7kkHjNTpQjC9+iMv5fxhTuCufngW1ie8ygNgOyIB2Nk8VYpLpWzcq8By0xivWWpMWhW6DUQFJ5EkFSMlyRBUOHxiF23ExVrWp57QQZ3OEjurU+hdUxh7W4vOoNKlX4q5jiHTNqnAi2+J2QpcJkJET1UDVXXTBk56CUYq9MFtqQlPc7wvA/TyII4pCFMiOz1Er5flcEXALIl6rBr7/fV9S1+Se0Yco7dG3tGzxrZQ+SnFz6JmXJmFKb8Vj1z1yb/2632akybcooXuCUhluFBfwv7KTUuGndEvXk+tsT9xQ2jmlZaOA2cQifz/aOLbOTK3tKqlPhcxrR+X+0a9bbdHdjCgrZZzvCTO79IaX+/huxRbei3QwXa6cnjh/K4q3qtG71AooMu2eXh82QQb3U69fZy9O+2C/9nVyk480M6umDi25BEqQ/1zP/3Nc3SxyTh9+QX46veY1jQo8P6fCCt+jx9uS8HpJQgrzYnYwK5vlaS/8eCtyYZK8hhtNqxczNo0nRzxMJ8hbDMmk0yHm7S7oXfnm9utU0QlQs+QXlzJaSMqRLxclhijAFcn9NrWt9SlN6f8CDbxQLUUS0JoZBEVK+JiSNbFN0veeQBk4DNfr/zqtid/c9Kv4wIkkteUPR1uyqa4zhRlizKgAuQp9enTVjnT3wfR5/7JvzNo3v/iHVKf85ZfJJZVDLiLUwNGtKqlfxcxrEgv3V49/lxUKcMK8PmifI9unv8BaW6GC9fsInNsPu0Oubq+nVvq4UtrUJhW1rzv8ccXYqRT7YywuuiS2qxgVkyJRr8Q9iVk8lyMdSaRGBny03tdoC0A6GhhRE4Nq0asz1a8+e2GVRrWGjEmRWKf0FBRkF6HCJds54m4b/8j/+7+nSpopbTghFOuaWNWZu2TB2UgSMfZeOL3nLIJ28d/bb5J0++nUa1K+RMGlXZvhhuztQ0MQU5nvWZnxJoeuqUcTpCRT14oyNH0Z3qWf3Tp654dYEQZIzDJMXo+uv7Zwu9iw7YeHyQYHeuLqMxT/QfopvoyuMEy0d8ufmDHrfrLuEmsbTnclp21/vcMKggdG4/8qUW4agHKcQXDecSKmVEwkFvQQZ6KMDFDz7W4tHmTFHE7rmR4q4MIsoNPF1keePLlER//xq/JHOy5O/hF5vWLR4mY/dRzjjA1aRQSdL2UthsqLcpnXjeDNFC+ZNZUYbTbDsmVPSrplvx99SwgBX6sWuZHRs0ZucWF2afkKVWByT2SelRb1SkP88dyphu1ciH+6j4FmprB8VmPRG9GTm6UmMKAkfooJ8kPJQOuS09O6zoV6fMXzPkNzJBEkhayLA4IE9eTXXWbUMDAGlEy3WqNHUrlmZ1qz8m2tk9enZWRNkwL+BSHE17eEkUtsl8rNA3BKSGCOCxR2IYe5vSU4H5r9Fswa8Tz1bfkzFC3xlsI+9TOli9OsvPzFy7E74gFXYbQrdWDvhMzWT32LuV1Xmep1NkHuF01kh+++YQnUGOdIyHGa4w1DbyQQB8srWk9y5fOnapUNOU0LPmyeHlirFRB+m+dQU7pyZEzQ9XnQjx7dG7s6NE1T2hxLaTUf/1NJR7yUqpQtXLXDe2+SXM6YXCzvesXHWFl226HKGkSd4UnNichbYt0iQ6qV/jHsVAalaZ50ejRleMxDDdoYPnEwSzKqv1hTT+3enCAfHIoh9unZprxlc86b1TPYahTMD7NqlneYGtGrZKN5gGHKfWMGsiVt7p6LerT+mm+tTJKjeMW/I+zxgl68HAtpa8hNjARFnJlHIUj9+KlhLkpAl1q+3+Hf1AtW92ueU00MQZLYgB/CCoaQLxCIFGUJ5itM3q8PV0bEvEVuv8P6+7P0homB20u38AconGumgznL00JZ4Xx+7xJFZkgNACLDhIk37/QO6uuaNONO36ApGq8qSke9RzbKfa6lcOXR20YbrBmIRJeg8vb62nMJ2/kQhy/Lzuf2gye/EHYvMTUMRp8ZZ9T4QscC8ivi9Ip2WvWJk+JrhpkIQYD7DGy5wiiwWmQu+HsyRomsQU5BFvJ/btYi37gFNWk2V8I9BFhfABvbrxmfMtelA9p75c31Nzap/xmskK8e+S1umvUPrJ79L84e+T4N+/ojqV/ycCrL4xXhYCtufsM7ZYQ8STGk+Pkivb62jiItzKPzIYF4febX3V+Yy9qDwE2MYmVZQ5ONDVtdJsMMkS2Yf+fs9YPjKWQTpzBBhRJAHDPlc4BTJLttP0M+ERS+OuPEgItrupUr5lg3L4v2ZHVsDtJ4rrFSwtJCIwH3bphW8lSIuIWyzYgppvufK+DOnj0tSK53jc28hEK6kdv905ulxhZNiGPNnxxmQZJ6zTxFBkuEyYK9U8Qc+/WbvG4Snl5SXKVG8MH/Sx/czN68e1eocxYtZ9jMqUEeBz41YB1N6mLMwl1KGkFs+v9w8I4ZtWP/dPuU2bTkxLmtu+TtDryC/M8iRnGEyQyQIETTZi16t8aLnozSCPGUo5gIE+VLOrMM4UL22d/EQe0JkcNilc1uLxRlKCVEz7FvERF5C21ggn7Np3VL6c/Iovh4OyQK4cJALwmfbvX013b150mWX8iQ2tW60YXi1s1K7FRlecTIMZ+RY7UWvd0EszeAU2cLwnguQBD1awTwIzpqJq1vY8yYh3pGE/GfZLMs6ToNv8TUHfGNv3pyOjQXc6fS4cJAKFNDEsnHPy9rI3lMwvG9xnY9943+SCCAFyPF6txeFb2Ku1hiNIOEMXRiSOZkgKB7OkQE7UqT2cisQf8iTwJrsGaroiAX4rhN2g+0touaOiJ776KmeHuttIe3D7Bfow3CEoYVF9izJ8WK8F0VsiyaHROgyg1PkOYO/C5wi3zKclRev8y8/8aX2Nl9JdmYfFzzgKwDYifDMwnoCCJFfxCAgSnxCbjpMxX471Zl3zJ2XttHp8YkoX5CIub+xiCCIN8I3GJKDY6cXBU83IMkthqwuQJJyDM9lk+C0KaNtfpM2r19K6YW8ZasWDa3qGZKrlLEU0x3jA3sPlqFDWjk9IAyX3EYEKcwQpthz/JJBz0eIuGO3aYRviT5dlBe9zVDKme6W6PbtLbNayJNjVtmWN+rPySO1mzTOwnqG8a6/AX276kZvJaAXrIwmY/NxDhvG278xRCm2vJvhozh/KCzAPDk0kqxnp8wYA5KEMCxnyOJEkqQUqhbRvUx5clhUubZ4i2rntpqhr1uz0OKmukYNamlNi5b+nA4x1377tBb3iThzgC0zV8xedxnV+RBbV4nzh+BGxUcQSRKj+ggw19E1EnbBPmJoyXCU4ZXx4hb0N9niZlWp/CN/TbhLx49ss+hnjh3eqq0yg6rhDT1At6pjt1f3Tqow3QHI0dqQHBkFIYxteCuD+dHd4L9YcL41QQRBU2N3R7XFs4v1LkMdhoMqMZCCVfdpoKB39cLBBN8oBNXot8ojuncLWmHoaMmWdZMe3TpYNY6ru1bzuRaaUhSsaCvNXYQDDGOk7cLmlQwtYpL6cQbpKA5GbDFPDhQOX4w1IAeKh786ojYi2t79RKEoRN3ljTQvfH5sVMUTW/5bqVJF6YKFjXogxKH9G+mvqX9Q86b1efUbTYnS0MuXK03PHl2K93WgSysbFdFTdWj/Bt3wLQTGGAoXyqe6VqMg3mHD0+M7YbO81oeHfcii6K4RYc9I+34dZ5o3aGrsNC8QtorFH6MNyHGDoZwjgnR2kT5k6C4ULDTfHm3c8+dM5krlMm+O7BFWSMvvK85OkmMsJjHOImGtAvbnoWcKVWkME8msk6nxVcQilpwEEE9LI9yDZk3rutQWW1cGOg/Qzay0s+9BfGlDcqAwOF49PRBWwNZfTDDwhvqZ9IY0ZslCoRKTILulkAPR/0mGXA4gBjp4vcWpEamNjLIn9MRxQ01uwQURoGSuznujHoEGQEwiQnIHy2vQpgGCmepxwjgt1lDjZOrUoRWfIrx784RFRUW5Mw/dtNC/0o3fwmbE339TyXHPlmLUojCYjyFI6xRZpzz8V0T/nbDvewwFTb1II5GV4t8ss1rh6wz8NJBjP0MGB6VwSzFcUoWRkRuPb2QUp8MJFlAr02eUPXsW+mPUAOrQvqW6106LXzD9h0LggH5dueIIFmZa+/SHiydHbsuULs4n4HQCxB+Uz545Xl2Eg5mf5raqeQjb/li0SUUfALNiOkXM1Pm2oZhoKoCZKJsVcey8Wo8BFwNyHMI4rgPI8QZDfdnaLts85s+ZZJVUDYz8x7Ilze61QDBYlpECImpHD26m0KDEuUPQvJUrwbJnz0w7mfumkyBuckAlXql3RIpFOG/Z2LXqIeseKIabirPDNxocBHC1RsbKzIoS/Gmt7cQwIL/KkN1B5Ggl17DxqTjmtpw8uiNBulXofFV3WYAsvuw0gZYVmhxtGSNAe7dxw9oaIRHX3Lp2TCeDKXIwDwBdClljhsMQlC9heN+G5MBDvyTDMznCEbrcfBIK/6a4Wi8ZGsaKsdlf1DUqw5Pw3Wo5yK1qJMkBQ8N2I2tnPtAifjhwo1psin6qZ8vMfV2cLPa68VjVUKpkUe09e3Tr6BJaXq6mRLnx38X8lFXuD5ZwfmzjuCMdw1ktMJ8WTxljZ6zu9UcMRfFa6gu/xbDPxMhtCjuTAyjD8FiSo2njOlZPxaFhcR5zxbwVBXWkgnFiYPDGEQawe/sqbWwWWl7xKZt42smxcsUcg7FioW/1qY3HNz5l2KB6Q5bU+SK2Y923ge3fjeU5CVWTcEW0oZADTg8fuTQHwDy1tRL9iE+GDDRoj+aB+q5tKx1erFP1m1q3bOQ0LS9Xa0BEnclbyCIJ7Lf1fnNmr++qwiPPR7J4+l/LOkU4SWL3Hd4zfoOvGK6Jf8QRldLO5HifYY28aCjKmUrhxpdixbZWNSBv+1NTHoc4a0zUL290wRAt20gtezI58LBDvUlRpETMsYnhcxuTAx7QKE22anjccYfZjpFNhjG4Kf+tDsNKkf5NZmeCtGMIl8Jwx6xsNsSTCZkoub0J/x0x7He+R8KZwz6y0RGknT5tjMeS49K5/VS3TjU1WYLu6wUMn9iYHG8yDFQnY0MWGKV0rSHJxhiSmMsAvO0AcqSRrhVSpGgZsXZ2AuuKM/pk0Ap048YM5gJuzjYMqK5I0kLTyRMLgAHL5/A+NuVkR5vQEFtmq5STA+QIlRmrl3MNC94JIskmKEGaIIgDu3KHySp5vbrVrY47IKdZscIPWvsJVMtfBd90CQNBH5hsdixRwp8LX3sKObCzECl2+eASuC2ylG/ZmBzvMYw2IMdsFkvsSBw5tJhkm5MIItas8f0fmTJ6044t/yTIt8X+cTyhsH4YhHEVI3lw5wzvKpZz6djf5+7EwENg+ZKZVKxoIfXUwANwB0M+W1bIBTk+YpihJZUkObbbhhwSziLIL3IasGmThDf2Yf4b7gw6aV3JWNAhXLp0MdE/ltuti4Zwpw7u20BNGtcx7m97KrwEuyghChGRSC2dOyHaLbIlOZxCEFExD5RqgO44dYdMHJ6kcp7kwd0zbpm6hbDeb7+24/1sCjHw4Nsralt2W5EmlEBfq3U7kIT3Eu60DTnwWs4gSA5ZMUfF2x3dj7Mnd2uqHKVLFXVqVs0eckjINiLOMG7+ZLjF0NXW9Q0zBPmQoTXDDoZgrfYxgrla8xLvavEx81HOIUh7GZz37N7RLVU/0Ignu1TbtG7iFjpViPHQ7dyyRUPKnMnHmBjogpgmRhQcKubBSPEOQ1WGg9qJMiy6vSSuIUBLC4bOIMh8eWHXrvrbLUXPVEXGebMnJdnfBU2YOA1HDu/LGzDV5k9R8Hsi7mceLyd/ic1oY0WzIclJ2fDNVpJjR/RQlclCoYMIArEFvo3JVgILroTL5wL50JWMsX7t3JZ271jNAveLXJbU1dvQQQpU/7G6oVrV8lx3zOi0iBQTnpOEu2xu4O1thg8Y3nPUPkG0qTO0YniixSUTLevF4tglRnEV9R5Hk8NLznpAd9WSab2khsEDe5icQUEgW79udf403rJxGR/7RaDrTGEHvDdIiyU+yxbP4BuyihYtaG7FAlafnWDozJAqnjHpTqJL94oQHJ/FUMjWqd44Wt2rio7c6JNkkmW1kVdro2MYZTakk6MJ8qYM0EuW8KeHbpbdgX6vb+zA1SSw5RYNlVBthIp5wPLZdOLodoslThPqMuEzrlw+h78nUuyyoBkHEHhPEAb+Rjz3N6MgkanXCRUrLN52AEmACkIuN2YWPY7WE5wySqMihqyWOFwcUcx9cIIULVLQITs+HJndqVenmmYQLfKlox11s9LI0t5UJ3daypru23j2m3/LfXy0qCA7hMZN7Ajp2a0jN+bpf/5BSxb+xRMAGDjasSWAu24A/ozlPkiZr1g6i+bMGE8Txg7hW6vatmnKlwBhnh/tOHgPc5OWigt1VCiLFEH1W7hM8d3bbxiuq68FMQyjtdlIAY9wkLuFk6S2OuNktj8r9jaDCwxfOqtIeF3u+3MnYTW4TrL/Kq/3d3SwQTZ6/FMOjvutc9CNlr60tU4WGvODD7XMn45KZElN6VN/a/EGKZVAMHTEBtADi0Zq/ncwRmTP4iGAKUAM/C+GpqJH7h1rslFCdX+VfL0C+fPS+jWLeLfDjctHuEaYHEkW8Us6B8Ykv2pyo8OiVXpMyVoprhVSxhWc2YO1Ud7wfbvWugU58NSWomfpmNFPL5+RHglymML9NjnoJiPMuabZaX3NLDTpRx/q4p+e6udJS2WypaacGRgRvv/G6jVsZsmFfSrsBCuW+Xt+mrWuVooPdCkibT8kZr0A1NdlZwSmN48EbjJI3+N0heaYeL8whioOTgPP0oL2MYaZLT4oNdnAtZpq7yHB+C5mf7nfAzsgknIdBEHugnlTDKbkOhdOT3da+ZolhzmAUHdb+9K1Fr50vll2OtE4G21nLtqyqpk54UaX8aG+xTNQtyLpqUOh9NSmQDpqzU6iVgz4888F0/P37lk0Aw0r5U2TGenmVcpEG2ploaMNs3EyXmnuS/cH1aRNiyarbSFwqcYktH4h4solqtC3qcTDsCG91fdr5uAU8OdCsio6HpkeU23nKz5iBOQuMqRxar6aXZzCcksU9mfcu3kySdY6LpzZS507tjFYuNmAnQAXmXFbSw5H4VmfcvT66p5Y05einlE2gffza7mKAg8KcwuNhgzqpcYhjR1MECC/thsErtZyIR433kDIur3BHLqTCPKmUM/jmZyJ44cmCQ3b6GryBdrL3EIIMqjZH7gwzfzS8ae0q5LjafeSFHF2MxfQq1q1vClX7BQC7QTcz1ryNVq2aMBT16auHXTJlGxWRScUEoHfZbUdA1Eh8w1Oj8BYmlhOJElNqbObO7evy4kb4IZCEhNduBCiQ42g22/tucCcj+GcA2VL/y0NLulN11v4ui45upWg8FPriNjvdUPZgIV+MWgRK67PP9YMNIms5AR5Lcx1DeBaynXa4rTK7gy7E7sJ92rZquEGp0dTL1f5ElXWZTIWgeGdsXAHYGINH5kVuHVXLx7kbRQQmcbyHaxRnjR+GBddwBQgbqh/4fyq4rghMVjQ29QvLe1kccIjFyUGJ0ePUhR+ZgMnB64BTkA5zFS3TlXaunG52o0LksxEIdASZXWhKbBLXpPzp/eYvO641lLYW8wBve8s22NEKK7WRwSOOy2tG8fFzSCOdU1sDdq6tna3UCm+fvkwPwV+/eUn3j6BGkyOHFm1FWuWFvayeaehUllTUz8WLIMYD9u4LjF4zPF7eYq4bCgagQeB/J1QJ4kIvcM1iKV0qpL2rSeq4nHdwy/EFihOsnAzXcuo2yh9XGud3LOF+sg0o01TA7xc8YtdLH+Gq/LG4MjHzbJ2/NbUSYGK9OYNy+inNk0ZGbJZTATUGXx80vN0JdY4V6pYlufxsZf86JpZdL93eZcmBUfbXPR8VEOKvBt7UGvYYC2bRH/PnaI9RCZPGG58Wr4W22VLi54qU/cvq/QCqlQux4XhTN0PqM4oDY6/uUBjY3qxb1PKWxXwctUvkdU6Jy80njRV2cWGQjpaI6xqtHt+jStpoPKMOQzjghmMH9VdFCkx0FSrRmVq3aoRde/agYYP6cPJGbBsNheAw5bboCdXYk/Q3T5ML8Y1p8ftcrkkOZ508KPg+T0p6rnph0y7ts3EtfiOdm5daXD9oCkMZXujrt0I0VfVhiG1aD5MIfrqqsjvw+kc8vw6PX90iU9U4gGF+/f4v/NUtmxJ+VrPcL9dwe5EU+NNhimO2HOTWJKkE/pYr9XKMdYUIPBDkBf64jpHCAMuPOa+IY6AVguIW0O0Ae0Zspqtvk6WzBm5iNvSRdP5zyRWlzfq5U0KWTuOnnQq4ELkyMnjjbB9C7V4wxRqVK+oKT9ik5bxv+P6YoEpTnMTFflQsRptrlAoCZD/hnsF9xXyTd7e6bjLBQHxls0bqmqXJ7EpzFXsDvtAnLmMNiGBe0uhgGFid0dq7ientqI9A6cIepjM5eYTPY998wC9GNuMuTQ5nUuO9rkpaEZnirx/Ml7XE7UnufT04lnzW7iwwgFrI5BltFVFH82KXvpXoonyP/ip6n4Qa/qVsMoLmSgs1HRUlT786Ep6Pqy244nC3g+xRsSZjexzxP+7wgWSu1MKFfLjohfxNmEG3aB/Vy/gdQw/v1zx9nn5+mbh273yMgIauWokROOS61aeeJIkE6eJtgQH7fElSxThpwL8ZBznjRvVpo4/t+JtDOiHunw+kGtjOaV9JeQWhR9ZSS8mtKLHP+e1LzHa5WYnV1NOTLh71qitFBS7HBGDQZHemhgP0j7ICP4xsr+BgglWGfTv25W30sN9RdAPvWSkfTFdmTbG7YWLVlm3cNtU2xfKG4DUJOIQCcQgiEdABldbMRDFiPL6RiCFBIyg50NqMvcnj+1qGn1+pJcL+lDEpZ1WEUNzm+6e1YqEeNgkRG0FwnB4SMl7U7F8GTp3ao/Z9DxOrc6d2qinyFrdwhNPEOxCvynXryEgT3LNjOwUi3p+hSKu7qXQTVMpaFoHejaoGj35paDFp8TTnmXoxZgm9HLZIAo/vYGinl4gSkSdCISQBMEmYEw1WqeBdddgpyBfFHT1aLw/d5y5u0oxEjHmR7qVJ44gBWXat2qV8hT+8nbSb4tnJ13U04sUee8YRVzcTq8CF1PolmkUsmYMP21CVo6k0HUTKGzHLAo/tppeXw+kyIenKSrous0+A1KuUHqU++StHVg7z06KPLlzaFkwDGpZ8nNI+VZgJ40gCBpVi+tWnnByAH3kkYxBJHeUBnIGUKMoJPaRo5vAWkVKZLW+F3Mq7X5qxpcWWVq4bda0nlpXqatbesIJ8o66M2SvmwxVuQJCnl/j/WW4roXZf62RRA1+eoUqViijLUHdbqWecof2LdR+rya6pSecIF/K+AOzFtZU03XEr6NbvFghbee8NavpICiBbGK0ImZRq1fkoVCrtLA00C094QQpEBN/lNMN28aoKGIBtNuctqKDGkooMjjHgiCrBC2CblCtGpWcOg/iTgTpIt2roYN76UZtYzSoX1Nzkw4HbrL450aP7K+laufMnGB1ariIfwH589BF89YtPWHkgPL7ItlYuGHtIt2obYyf2zXXlg6hKdPSn/v1l7baz0H4zpr3xF56RaHxvKP1e92JIJ/FSJOmpTvsyaMbtW2BOoY8CbCW2doYAptqrVGjQQare7cOaqFwvG7pCSdIeiksh5YI3aBtjykTh2vG2r9fV4s7EZo3i5btwaxM4J51VmkV+8VME76ExJBu6QknSFltx3irRrpB2wFYk6bOx7Rp1dgiAb/2wjVDV7U6RxJf/xYELpTTY19i9Ld0gnz3TQ95McePHawbtB2wbdOKWIrtyGhBXSau1O2gATGi3JBAtWhPCrYQZ/RWs1eVdCtPODmSyd0huIHuuJrNFXDkwGbjlWla8I1W+LmzJvKKu/HPLfr7T+17e/fsHO/74JSRbSkC8x21BsFdCfKhVMjA5ttzp3brBm0HXLlwgPzyajHBA4Ytov1Dc7sQ/w0f2ocOB27kXdPRxNqkKUhChQZd1ebaWaZMHGGscg/F97S6lSeOIFgNfRkXFOrmegXdPkDDIvqwhOFeFcILtcTizUj1VAEhMIGIdnWIOkjpHmiDrWcnPJ85v3+ey/ogZTx6RD++F95I0R07QvLrFp54guBGBcn5Zt2Y7bWd9g4fOFNOkByiQfRTQZRNIttkNK35jcE0Ya6c2XlHMAqA2KjlEzN3riqYYEd6Lks0tvSv+AlSSl7cn9xg8aUro3HD2mratbhyD7yEakkBsR/kkFjQGWXF6HOk2CqFbbef65ZtO4K0khcZEjy6IdsPkDlSnvI147gnHzPkRHMhw2ihk3VUNJM+FOS5L/QDkMKdh0yVELTWjdrGBBnkDpthkwLGjRmkPvE7WHGPpNwo1j3nZsjL4MvwrS7GYH+CzJUjtnoPln2hpmyhb6Vbn+uTI4XcPAXlw0P7N+qGbEdAklUJuGfpFuj6BPlApBn5UM6lc4G6IdsREAlHT5UgyDrdAl2fIF8JWUouXQl5Gt2QHbau+qAeULs+QVLLImE+v9xceEw3ZPsBAntKhy1WHbypW6FrE8SH4Q5uGApPuhHbF3dunFAn/PBg+li3QtcmSDYxismrvLoR27/dpFTJIurGJ93HcnGC5JKDUjVrVNKN2AH6WGjnUZQO0+hW6NoEySuXetavW103YjsDnbhKP9ZdXUTB9QmSjyEMN6xRg1q6EdsZUGCXInBix2Bm3QpdmyAF5ExCsyZ1dSO2M7DGwIggWXUrdG2C+ImRTGrYoKZuxHYG5jiwrk5xsXx0K3T9GITPINSpXVU3YjsDW4SNgnR92s/FCYKW6ue4YdgcpRuxvdO854zTvN/qVujaBMki5gr4YhfdiO1cKLx+XNtVKAqFn+hW6NoEwRro67hhBfLn4ZuMdEO2H7AKG1tuBUFO62ojrk+QVAxn+ELIrJmCnj64OIXdyAk67ION/y5e7OOdPkwQZKtuga5PEIhWDxeB+ji9u9Tu1xujtKsYnunLbOL++j/ErvUC2TRsFQAAAABJRU5ErkJggg==
ec0b5714-7496-496d-b455-3027d58e7fde	\N	$2b$10$hBD3UV2V.AzyWrVH3WLeh.Q1fqhDfZ/o/pJcj/aumhNyO71GRaYwu	EDITOR	2026-03-16 05:30:45.499	2026-03-16 09:01:59.157	user2	user2chang	2177d76644f629e6	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: infrapilot
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
4089f7a0-0aab-4a4f-b702-442c628cf0c1	dd14cf07a94304ffcb69662f1871a0d64ffe9ee4c31d5b694e53a4fd3dfbec2c	2026-03-14 10:54:42.565951+00	20260223141606_add_metadata_and_env	\N	\N	2026-03-14 10:54:42.443801+00	1
55c900cb-774b-4314-858a-c686f4030ece	1c09bed321c183878aac4d695c201d2d3bd4ea658b0cc01015fd544fc7e3ba89	2026-03-14 10:54:42.587752+00	20260313171708_update_asset_fields	\N	\N	2026-03-14 10:54:42.570027+00	1
c2c6669c-e543-457d-b90a-25a87c14a6d7	ae03ae7f89f37db9e6e78819b85303b727b6b1990e24a8b653c92e538bd90162	2026-03-14 10:54:42.603041+00	20260314091356_add_credential_type	\N	\N	2026-03-14 10:54:42.591554+00	1
965a93a2-2c43-4abe-a7fe-248fc6787681	2b01b0a2a70c72b3cc27cfedd6910baa425ef2e7ca7e45f41107c14a55773b23	2026-03-14 10:54:42.640655+00	20260314105424_hardware_only_focus	\N	\N	2026-03-14 10:54:42.606843+00	1
01724965-765c-4739-b100-a3cb179d8e89	35833d68c091775b028c34d5df23c13146b57e16f9d8522d0c9c4531fef54e4e	2026-03-14 13:29:52.912573+00	20260314132952_allow_cascade_delete_hierarchy	\N	\N	2026-03-14 13:29:52.891561+00	1
5031366e-a9e9-4244-990f-03b4c8cf14ab	50993eb97b4d6ae566398fea894698e399392ac30e74de6821a2bea78a67ae1a	2026-03-15 09:19:04.436478+00	20260315091904_add_access_point_version_fields	\N	\N	2026-03-15 09:19:04.42183+00	1
761b25fd-2f2b-4d1b-a4c7-35ccafb78773	ff8e8decf7017db4d96909dad5d05e6236d29189ff7449281462419f4674d415	2026-03-15 10:23:25.306721+00	20260315102325_add_node_label_to_access_data	\N	\N	2026-03-15 10:23:25.27891+00	1
54098327-0b3c-42ba-8f8d-0d40053c408a	73705d81a45ef9c671167b837ec6e4e42e29d5c8b627e60f178f7861440497ec	2026-03-16 03:12:38.152752+00	20260316031238_add_user_account_audit_actions	\N	\N	2026-03-16 03:12:38.130901+00	1
49496b0e-1469-40ff-bd8d-70fa7b47b061	55dfcc5295b7820b1310beb77f1801146a7b8f002ad226e60314655a8bec251c	2026-03-16 05:04:49.545616+00	20260316034500_use_username_and_display_name_for_users	\N	\N	2026-03-16 05:04:49.501853+00	1
a2a459ec-8b0e-4faa-9904-2a7598d2226c	78c828da265f04acd00f612b6e6e0c917eea886888eea1b93e276e47e48fb1a3	2026-03-16 05:58:03.021932+00	20260316052000_add_user_avatar_seed	\N	\N	2026-03-16 05:58:02.997752+00	1
e5fa80f5-4551-4e13-b359-e9e3a6f45a94	8ab54d7c51c3832a42609b15624ee7e76d236ceefbe811ce318c511b61a595dc	2026-03-16 06:45:07.638057+00	20260316061000_add_user_avatar_image	\N	\N	2026-03-16 06:45:07.619086+00	1
d66ae7fa-1942-474f-bc14-c4602ac433b4	12f994029dc1a2df4b50811e9493e0105143dccccdf01e1e22c1197d921966f3	2026-03-16 11:59:06.908595+00	20260316103000_add_database_inventory_models	\N	\N	2026-03-16 11:59:06.74417+00	1
\.


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Credential Credential_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."Credential"
    ADD CONSTRAINT "Credential_pkey" PRIMARY KEY (id);


--
-- Name: DatabaseAccount DatabaseAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."DatabaseAccount"
    ADD CONSTRAINT "DatabaseAccount_pkey" PRIMARY KEY (id);


--
-- Name: DatabaseInventory DatabaseInventory_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."DatabaseInventory"
    ADD CONSTRAINT "DatabaseInventory_pkey" PRIMARY KEY (id);


--
-- Name: IPAllocation IPAllocation_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."IPAllocation"
    ADD CONSTRAINT "IPAllocation_pkey" PRIMARY KEY (id);


--
-- Name: PatchInfo PatchInfo_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."PatchInfo"
    ADD CONSTRAINT "PatchInfo_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Asset_assetId_key; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE UNIQUE INDEX "Asset_assetId_key" ON public."Asset" USING btree ("assetId");


--
-- Name: DatabaseAccount_databaseInventoryId_idx; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE INDEX "DatabaseAccount_databaseInventoryId_idx" ON public."DatabaseAccount" USING btree ("databaseInventoryId");


--
-- Name: DatabaseInventory_environment_idx; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE INDEX "DatabaseInventory_environment_idx" ON public."DatabaseInventory" USING btree (environment);


--
-- Name: DatabaseInventory_name_idx; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE INDEX "DatabaseInventory_name_idx" ON public."DatabaseInventory" USING btree (name);


--
-- Name: IPAllocation_address_assetId_key; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE UNIQUE INDEX "IPAllocation_address_assetId_key" ON public."IPAllocation" USING btree (address, "assetId");


--
-- Name: PatchInfo_assetId_key; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE UNIQUE INDEX "PatchInfo_assetId_key" ON public."PatchInfo" USING btree ("assetId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: infrapilot
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Asset Asset_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asset Asset_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Credential Credential_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."Credential"
    ADD CONSTRAINT "Credential_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DatabaseAccount DatabaseAccount_databaseInventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."DatabaseAccount"
    ADD CONSTRAINT "DatabaseAccount_databaseInventoryId_fkey" FOREIGN KEY ("databaseInventoryId") REFERENCES public."DatabaseInventory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DatabaseInventory DatabaseInventory_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."DatabaseInventory"
    ADD CONSTRAINT "DatabaseInventory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IPAllocation IPAllocation_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."IPAllocation"
    ADD CONSTRAINT "IPAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PatchInfo PatchInfo_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapilot
--

ALTER TABLE ONLY public."PatchInfo"
    ADD CONSTRAINT "PatchInfo_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: infrapilot
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict eeBBYYezs1IrRsphpaNaDsSHId76bvx4yfeA0fowdaI2Hqv5ifthwIGKmWzYfZz

