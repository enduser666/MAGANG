import { BaseRepository } from './base';

export class UserRepository extends BaseRepository {
  async findMany() {
    return this.db.users.findMany();
  }

  async findByUsername(username: string) {
    return this.db.users.findByUsername(username);
  }

  async create(data: {
    username: string;
    passwordHash: string;
    role?: string;
    fullName?: string;
    nip?: string;
    email?: string;
    phoneNumber?: string;
    unitKerja?: string;
  }) {
    return this.db.users.create(data);
  }

  async updateProfile(
    userId: number,
    data: {
      fullName?: string;
      avatarUrl?: string;
      email?: string;
      nip?: string;
      phoneNumber?: string;
      unitKerja?: string;
      role?: string;
    }
  ) {
    return this.db.users.updateProfile(userId, data);
  }

  async deleteUser(userId: number) {
    return this.db.users.deleteUser(userId);
  }
}
