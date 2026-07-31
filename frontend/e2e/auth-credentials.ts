type TestRole = 'admin' | 'editor' | 'viewer';

const roleConfig: Record<TestRole, { username: string; passwordEnv: string }> = {
  admin: { username: 'admin', passwordEnv: 'DEFAULT_ADMIN_PASSWORD' },
  editor: { username: 'soc_analyst', passwordEnv: 'DEFAULT_EDITOR_PASSWORD' },
  viewer: { username: 'test_viewer', passwordEnv: 'DEFAULT_VIEWER_PASSWORD' },
};

export function getE2eCredentials(role: TestRole) {
  const config = roleConfig[role];
  const password = process.env[config.passwordEnv];

  if (!password) {
    throw new Error(
      `${config.passwordEnv} is required. Run the root setup script or provide a development-safe value.`,
    );
  }

  return { username: config.username, password };
}
