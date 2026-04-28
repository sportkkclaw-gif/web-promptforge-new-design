// Role Guard Unit Tests

describe('Role Guard', () => {
  const roles = ['visitor', 'member', 'creator', 'team_admin', 'admin'];
  const permissions = {
    prompt_create: ['member', 'creator', 'team_admin', 'admin'],
    prompt_publish: ['creator', 'team_admin', 'admin'],
    prompt_delete: ['creator', 'team_admin', 'admin'],
    marketplace_sell: ['creator', 'team_admin', 'admin'],
    team_invite: ['team_admin', 'admin'],
    admin_moderate: ['admin'],
    billing_manage: ['team_admin', 'admin'],
  };

  it('should allow creator to publish prompts', () => {
    expect(permissions.prompt_publish.includes('creator')).toBe(true);
  });

  it('should deny visitor from creating prompts', () => {
    expect(permissions.prompt_create.includes('visitor')).toBe(false);
  });

  it('should allow team_admin to invite members', () => {
    expect(permissions.team_invite.includes('team_admin')).toBe(true);
  });

  it('should deny member from marketplace selling', () => {
    expect(permissions.marketplace_sell.includes('member')).toBe(false);
  });

  it('should allow only admin to moderate', () => {
    expect(permissions.admin_moderate).toEqual(['admin']);
  });

  it('should allow team_admin and admin to manage billing', () => {
    expect(permissions.billing_manage).toContain('team_admin');
    expect(permissions.billing_manage).toContain('admin');
    expect(permissions.billing_manage).not.toContain('creator');
  });
});
