/**
 * Next.js Instrumentation
 * 应用启动时初始化任务系统
 */

export async function register() {
  // 仅在服务端运行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 动态导入避免客户端加载
    const { initTaskSystem } = await import('@/lib/tasks/init')

    // 初始化任务系统（自动注册所有 Provider 和 Handler，启动调度器）
    initTaskSystem()

    console.log('[Instrumentation] 任务系统已初始化')
  }
}