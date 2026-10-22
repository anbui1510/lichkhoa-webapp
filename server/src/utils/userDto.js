export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export function toProfilePayload(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone || '',
    birthDate: user.birthDate || '',
    country: user.country || '',
    address: user.address || '',
    avatarUrl: user.avatarUrl || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    settings: user.settings || null
  };
}
