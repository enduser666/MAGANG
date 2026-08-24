export interface ValidationResult<T> {
  success: boolean;
  errors: string[];
  data?: T;
}

export class Validators {
  static login(body: any): ValidationResult<{ username: string; password:  string }> {
    const errors: string[] = [];
    
    if (!body || typeof body !== 'object') {
      return { success: false, errors: ['Payload request tidak valid'] };
    }

    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!username) {
      errors.push('Username tidak boleh kosong');
    }
    if (!password) {
      errors.push('Password tidak boleh kosong');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      errors: [],
      data: { username, password }
    };
  }

  static tableRecordUpdate(body: any): ValidationResult<Record<string, any>> {
    if (!body || typeof body !== 'object') {
      return { success: false, errors: ['Payload data tidak valid'] };
    }

    // Do not allow updating system identifiers or keys directly
    const sanitized = { ...body };
    delete sanitized.id;
    delete sanitized.createdAt;
    delete sanitized.updatedAt;

    return {
      success: true,
      errors: [],
      data: sanitized
    };
  }
}
