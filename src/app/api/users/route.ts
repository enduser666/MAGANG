import { ApiResponse } from '@/lib/api-response';
import { UserService } from '@/services/UserService';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const service = new UserService(dbType, dbConfig);

    const users = await service.listUsers();
    return ApiResponse.success(users, 'Users listed successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to list users.', error, 500);
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const service = new UserService(dbType, dbConfig);

    const body = await request.json();
    const newUser = await service.createUser(body);

    return ApiResponse.success(newUser, 'User created successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to create user.', error, 400);
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const service = new UserService(dbType, dbConfig);

    const body = await request.json();
    const updatedUser = await service.updateUser(body);

    return ApiResponse.success(updatedUser, 'User updated successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to update user.', error, 400);
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const service = new UserService(dbType, dbConfig);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    await service.deleteUser(Number(userId));

    return ApiResponse.success(null, 'User deleted successfully.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to delete user.', error, 400);
  }
});
