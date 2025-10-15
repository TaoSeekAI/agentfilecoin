/**
 * PhaseBase - 阶段基类
 * 所有阶段都继承此基类
 */

export class PhaseBase {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * 执行阶段 - 子类必须实现
   */
  async execute(context) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * 验证参数 - 子类可以覆盖
   */
  validateParams(params) {
    return { valid: true };
  }

  /**
   * 日志辅助函数
   */
  log(message) {
    console.log(`   ${message}`);
  }

  logSection(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${title}`);
    console.log('─'.repeat(60));
  }

  logSuccess(message) {
    console.log(`   ✅ ${message}`);
  }

  logError(message) {
    console.log(`   ❌ ${message}`);
  }

  logWarning(message) {
    console.log(`   ⚠️  ${message}`);
  }

  logInfo(message) {
    console.log(`   ℹ️  ${message}`);
  }
}
