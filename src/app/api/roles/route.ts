import { NextResponse } from 'next/server';
import { getDbClient } from '@/db';

export async function GET() {
  try {
    const db = getDbClient('mysql', null);
    const roles = await db.roles.findMany();
    
    // Convert to matrix format expected by UI
    const matrix: any[] = [];
    for (const role of roles) {
      if (role.permissions && role.permissions.length > 0) {
         for (const p of role.permissions) {
            let row = matrix.find(r => r.featureArea === p.featureArea);
            if (!row) {
               row = { featureArea: p.featureArea, roles: {} };
               matrix.push(row);
            }
            row.roles[role.name] = {
               read: p.read,
               write: p.write,
               delete: p.delete,
               execute: p.execute
            };
         }
      }
    }
    
    return NextResponse.json({ success: true, data: { roles, matrix } });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roleName, permissions } = body;
    
    if (!roleName || !permissions) {
       return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }
    
    const db = getDbClient('mysql', null);
    const roles = await db.roles.findMany();
    let role = roles.find((r: any) => r.name.toLowerCase() === roleName.toLowerCase());
    
    if (!role) {
       // Create role if doesn't exist? Actually let's assume it exists or create it
       return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    await db.roles.updateMatrix(role.id, permissions);
    
    return NextResponse.json({ success: true, message: 'Permissions updated' });
  } catch (error: any) {
    console.error('Error updating roles matrix:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
