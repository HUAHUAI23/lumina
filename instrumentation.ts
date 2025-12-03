/**
 * Next.js Instrumentation
 * 应用启动时注册 Provider 并启动任务调度器
 */

export async function register() {
  // 仅在服务端运行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 动态导入避免客户端加载
    const { initScheduler, providerRegistry, VideoMotionProvider } = await import('@/lib/tasks')

    // 注册 Provider
    providerRegistry.register(new VideoMotionProvider())

    // 启动任务调度器
    initScheduler()

    console.log('[Instrumentation] 任务系统已初始化')
  }
}