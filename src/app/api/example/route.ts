/**
 * Example API Route with JWT Authentication
 * 示例：带 JWT 认证的 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证 JWT token
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
  }

  // 返回用户信息
  return NextResponse.json({
    message: '获取用户信息成功',
    data: {
      user,
    },
  });
}

export async function POST(request: NextRequest) {
  // 验证 JWT token
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 处理业务逻辑
    // 可以访问 user.id, user.email 等信息

    return NextResponse.json({
      message: '操作成功',
      data: {
        userId: user.id,
        ...body,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '请求处理失败' }, { status: 500 });
  }
}
