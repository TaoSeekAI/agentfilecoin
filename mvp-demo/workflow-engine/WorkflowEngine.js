/**
 * WorkflowEngine - 工作流编排引擎
 * 协调阶段执行、状态转换、错误处理
 */

import { StateManager } from './StateManager.js';
import { Phase1_RegisterAgent } from './phases/Phase1_RegisterAgent.js';
import { Phase2_ScanNFT } from './phases/Phase2_ScanNFT.js';
import { Phase3_CreateRequest } from './phases/Phase3_CreateRequest.js';
import { Phase4_MigrateFilecoin } from './phases/Phase4_MigrateFilecoin.js';
import { Phase5_GenerateProof } from './phases/Phase5_GenerateProof.js';
import { Phase6_SubmitValidation } from './phases/Phase6_SubmitValidation.js';
import { Phase7_FinalReport } from './phases/Phase7_FinalReport.js';

export class WorkflowEngine {
  constructor(config = {}) {
    this.stateManager = new StateManager(config.workflowsDir);
    this.config = config;

    // 初始化阶段执行器
    this.phases = {
      1: new Phase1_RegisterAgent(),
      2: new Phase2_ScanNFT(),
      3: new Phase3_CreateRequest(),
      4: new Phase4_MigrateFilecoin(),
      5: new Phase5_GenerateProof(),
      6: new Phase6_SubmitValidation(),
      7: new Phase7_FinalReport()
    };
  }

  /**
   * 获取当前工作流状态
   */
  getStatus() {
    return this.stateManager.getWorkflowSummary();
  }

  /**
   * 开始新的工作流
   */
  async startNewWorkflow(config = {}) {
    console.log('\n🚀 Starting new workflow...\n');

    // 检查是否有活动工作流
    const existing = this.stateManager.loadActiveWorkflow();
    if (existing && existing.status !== 'completed') {
      throw new Error(
        `Active workflow exists (${existing.workflowId}). ` +
        `Please complete or reset it first.`
      );
    }

    // 创建新工作流
    const workflow = this.stateManager.createWorkflow(config);
    console.log(`✅ Workflow created: ${workflow.workflowId}\n`);

    return {
      success: true,
      workflowId: workflow.workflowId,
      message: 'Workflow initialized. Ready to start Phase 1.',
      nextAction: 'execute_phase',
      nextPhase: 1
    };
  }

  /**
   * 执行指定阶段
   */
  async executePhase(phaseNumber, params = {}) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔧 Executing Phase ${phaseNumber}`);
    console.log('='.repeat(80));

    // 检查是否可以执行
    const check = this.stateManager.canExecutePhase(phaseNumber);
    if (!check.can) {
      throw new Error(check.reason);
    }

    // 加载工作流
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    // 开始执行阶段
    this.stateManager.startPhase(phaseNumber);

    try {
      // 获取阶段执行器
      const phase = this.phases[phaseNumber];
      if (!phase) {
        throw new Error(`Invalid phase number: ${phaseNumber}`);
      }

      // 准备执行上下文
      const context = this.buildPhaseContext(workflow, phaseNumber, params);

      // 执行阶段
      console.log(`\n⚙️  Phase ${phaseNumber}: ${phase.name}`);
      console.log(`   Description: ${phase.description}\n`);

      const result = await phase.execute(context);

      // 保存结果
      this.stateManager.completePhase(phaseNumber, result);

      console.log(`\n✅ Phase ${phaseNumber} completed successfully!\n`);

      // 返回结果和下一步建议
      return {
        success: true,
        phase: phaseNumber,
        result,
        nextAction: phaseNumber < 7 ? 'continue_to_next_phase' : 'workflow_completed',
        nextPhase: phaseNumber < 7 ? phaseNumber + 1 : null
      };

    } catch (error) {
      console.error(`\n❌ Phase ${phaseNumber} failed:`, error.message);

      // 保存错误
      this.stateManager.failPhase(phaseNumber, error);

      return {
        success: false,
        phase: phaseNumber,
        error: error.message,
        nextAction: 'retry_or_fix',
        canRetry: true
      };
    }
  }

  /**
   * 构建阶段执行上下文
   */
  buildPhaseContext(workflow, phaseNumber, params) {
    const context = {
      workflow,
      config: { ...workflow.config, ...params },
      params,
      phaseNumber
    };

    // 添加前置阶段的结果
    for (let i = 1; i < phaseNumber; i++) {
      const phaseKey = `phase${i}`;
      const phaseData = workflow.phases[phaseKey];

      if (phaseData.status === 'completed' && phaseData.result) {
        context[`phase${i}Result`] = phaseData.result;
      }
    }

    return context;
  }

  /**
   * 继续到下一个阶段
   */
  async continueToNextPhase(params = {}) {
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    const nextPhase = workflow.currentPhase + 1;
    if (nextPhase > 7) {
      return {
        success: false,
        message: 'Workflow already completed',
        currentPhase: workflow.currentPhase
      };
    }

    return await this.executePhase(nextPhase, params);
  }

  /**
   * 重试当前阶段
   */
  async retryCurrentPhase(params = {}) {
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    const currentPhase = workflow.currentPhase || 1;
    return await this.executePhase(currentPhase, params);
  }

  /**
   * 跳转到指定阶段（仅限已完成的阶段）
   */
  async jumpToPhase(phaseNumber, params = {}) {
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    // 检查是否可以跳转
    if (phaseNumber < 1 || phaseNumber > 7) {
      throw new Error('Invalid phase number');
    }

    if (phaseNumber > workflow.currentPhase + 1) {
      throw new Error(
        `Cannot jump to Phase ${phaseNumber}. ` +
        `Complete previous phases first.`
      );
    }

    return await this.executePhase(phaseNumber, params);
  }

  /**
   * 获取阶段结果
   */
  getPhaseResult(phaseNumber) {
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    const phaseKey = `phase${phaseNumber}`;
    const phaseData = workflow.phases[phaseKey];

    if (!phaseData) {
      throw new Error(`Invalid phase: ${phaseNumber}`);
    }

    if (phaseData.status !== 'completed') {
      return {
        available: false,
        status: phaseData.status,
        message: `Phase ${phaseNumber} is not completed yet`
      };
    }

    return {
      available: true,
      status: phaseData.status,
      result: phaseData.result,
      completedAt: phaseData.completedAt
    };
  }

  /**
   * 记录用户决策
   */
  logUserDecision(action, decision, comments = '') {
    return this.stateManager.logUserAction(action, decision, comments);
  }

  /**
   * 重置工作流
   */
  resetWorkflow() {
    console.log('\n⚠️  Resetting workflow...\n');
    const result = this.stateManager.resetWorkflow();
    console.log('✅ Workflow reset successfully\n');
    return result;
  }

  /**
   * 获取阶段列表和描述
   */
  listPhases() {
    return Object.entries(this.phases).map(([num, phase]) => ({
      phase: parseInt(num),
      name: phase.name,
      description: phase.description,
      requiredInputs: phase.requiredInputs || [],
      outputs: phase.outputs || []
    }));
  }

  /**
   * 验证阶段参数
   */
  validatePhaseParams(phaseNumber, params) {
    const phase = this.phases[phaseNumber];
    if (!phase) {
      return { valid: false, errors: ['Invalid phase number'] };
    }

    if (!phase.validateParams) {
      return { valid: true };
    }

    return phase.validateParams(params);
  }

  /**
   * 获取完整报告
   */
  async generateFullReport() {
    const workflow = this.stateManager.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    if (workflow.currentPhase !== 7) {
      throw new Error('Workflow not completed yet');
    }

    // Phase 7 的结果就是完整报告
    const phase7Result = this.getPhaseResult(7);
    if (!phase7Result.available) {
      throw new Error('Final report not available');
    }

    return phase7Result.result;
  }
}
