/**
 * StateManager - 工作流状态管理器
 * 负责持久化工作流状态，支持保存、加载、更新状态
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StateManager {
  constructor(workflowsDir = null) {
    this.workflowsDir = workflowsDir || path.join(__dirname, '../workflows');
    this.activeWorkflowPath = path.join(this.workflowsDir, 'active-workflow.json');
    this.phaseOutputsDir = path.join(this.workflowsDir, 'phase-outputs');

    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 确保必要的目录存在
   */
  ensureDirectories() {
    if (!fs.existsSync(this.workflowsDir)) {
      fs.mkdirSync(this.workflowsDir, { recursive: true });
    }
    if (!fs.existsSync(this.phaseOutputsDir)) {
      fs.mkdirSync(this.phaseOutputsDir, { recursive: true });
    }
  }

  /**
   * 生成新的工作流 ID
   */
  generateWorkflowId() {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建新的工作流
   */
  createWorkflow(config = {}) {
    const workflowId = this.generateWorkflowId();
    const now = new Date().toISOString();

    const workflow = {
      workflowId,
      createdAt: now,
      updatedAt: now,
      currentPhase: 0, // 0 表示未开始
      status: 'initialized', // initialized, in_progress, waiting_for_input, completed, failed
      config: {
        nftContract: config.nftContract || process.env.NFT_CONTRACT_ADDRESS,
        startTokenId: config.startTokenId || parseInt(process.env.NFT_START_TOKEN_ID || '0'),
        endTokenId: config.endTokenId || parseInt(process.env.NFT_END_TOKEN_ID || '4'),
        validatorAddress: config.validatorAddress || null,
        ...config
      },
      phases: {
        phase1: { status: 'pending', result: null },
        phase2: { status: 'pending', result: null },
        phase3: { status: 'pending', result: null },
        phase4: { status: 'pending', result: null },
        phase5: { status: 'pending', result: null },
        phase6: { status: 'pending', result: null },
        phase7: { status: 'pending', result: null }
      },
      userActions: [],
      errors: []
    };

    // 保存为活动工作流
    this.saveWorkflow(workflow);

    return workflow;
  }

  /**
   * 加载活动工作流
   */
  loadActiveWorkflow() {
    if (!fs.existsSync(this.activeWorkflowPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.activeWorkflowPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load active workflow:', error.message);
      return null;
    }
  }

  /**
   * 保存工作流状态
   */
  saveWorkflow(workflow) {
    workflow.updatedAt = new Date().toISOString();

    // 保存到活动工作流文件
    fs.writeFileSync(
      this.activeWorkflowPath,
      JSON.stringify(workflow, null, 2),
      'utf-8'
    );

    // 同时备份到历史文件
    const historyPath = path.join(
      this.workflowsDir,
      `${workflow.workflowId}.json`
    );
    fs.writeFileSync(
      historyPath,
      JSON.stringify(workflow, null, 2),
      'utf-8'
    );

    return workflow;
  }

  /**
   * 更新工作流状态
   */
  updateWorkflow(updates) {
    const workflow = this.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    // 合并更新
    Object.assign(workflow, updates);

    return this.saveWorkflow(workflow);
  }

  /**
   * 更新阶段状态
   */
  updatePhase(phaseNumber, updates) {
    const workflow = this.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    const phaseKey = `phase${phaseNumber}`;
    if (!workflow.phases[phaseKey]) {
      throw new Error(`Invalid phase: ${phaseNumber}`);
    }

    // 更新阶段数据
    workflow.phases[phaseKey] = {
      ...workflow.phases[phaseKey],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // 如果阶段完成，更新 currentPhase
    if (updates.status === 'completed') {
      workflow.currentPhase = phaseNumber;
    }

    return this.saveWorkflow(workflow);
  }

  /**
   * 开始执行阶段
   */
  startPhase(phaseNumber) {
    return this.updatePhase(phaseNumber, {
      status: 'in_progress',
      startedAt: new Date().toISOString()
    });
  }

  /**
   * 完成阶段
   */
  completePhase(phaseNumber, result) {
    const workflow = this.updatePhase(phaseNumber, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      result
    });

    // 保存阶段输出到单独文件
    this.savePhaseOutput(phaseNumber, result);

    return workflow;
  }

  /**
   * 阶段执行失败
   */
  failPhase(phaseNumber, error) {
    const workflow = this.updatePhase(phaseNumber, {
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      }
    });

    // 记录错误
    workflow.errors.push({
      phase: phaseNumber,
      timestamp: new Date().toISOString(),
      error: error.message
    });

    return this.saveWorkflow(workflow);
  }

  /**
   * 保存阶段输出到单独文件
   */
  savePhaseOutput(phaseNumber, output) {
    const outputPath = path.join(
      this.phaseOutputsDir,
      `phase${phaseNumber}-output.json`
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(output, null, 2),
      'utf-8'
    );
  }

  /**
   * 加载阶段输出
   */
  loadPhaseOutput(phaseNumber) {
    const outputPath = path.join(
      this.phaseOutputsDir,
      `phase${phaseNumber}-output.json`
    );

    if (!fs.existsSync(outputPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(outputPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load phase ${phaseNumber} output:`, error.message);
      return null;
    }
  }

  /**
   * 记录用户操作
   */
  logUserAction(action, decision, comments = '') {
    const workflow = this.loadActiveWorkflow();
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    workflow.userActions.push({
      timestamp: new Date().toISOString(),
      action,
      decision,
      comments
    });

    return this.saveWorkflow(workflow);
  }

  /**
   * 获取工作流摘要
   */
  getWorkflowSummary() {
    const workflow = this.loadActiveWorkflow();
    if (!workflow) {
      return {
        hasActiveWorkflow: false,
        message: 'No active workflow'
      };
    }

    const completedPhases = Object.entries(workflow.phases)
      .filter(([_, phase]) => phase.status === 'completed')
      .length;

    const totalPhases = Object.keys(workflow.phases).length;

    return {
      hasActiveWorkflow: true,
      workflowId: workflow.workflowId,
      status: workflow.status,
      currentPhase: workflow.currentPhase,
      progress: `${completedPhases}/${totalPhases}`,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      phases: workflow.phases,
      nextAction: this.getNextAction(workflow)
    };
  }

  /**
   * 获取下一个建议操作
   */
  getNextAction(workflow) {
    const currentPhase = workflow.currentPhase;

    if (currentPhase === 0) {
      return 'Start Phase 1: Register Agent';
    }

    if (currentPhase === 7) {
      return 'Workflow completed';
    }

    const currentPhaseData = workflow.phases[`phase${currentPhase}`];
    if (currentPhaseData.status === 'completed') {
      return `Continue to Phase ${currentPhase + 1}`;
    }

    if (currentPhaseData.status === 'failed') {
      return `Retry Phase ${currentPhase}`;
    }

    return `Complete Phase ${currentPhase}`;
  }

  /**
   * 重置工作流
   */
  resetWorkflow() {
    if (fs.existsSync(this.activeWorkflowPath)) {
      // 归档当前工作流
      const workflow = this.loadActiveWorkflow();
      if (workflow) {
        const archivePath = path.join(
          this.workflowsDir,
          `${workflow.workflowId}-archived-${Date.now()}.json`
        );
        fs.copyFileSync(this.activeWorkflowPath, archivePath);
      }

      // 删除活动工作流
      fs.unlinkSync(this.activeWorkflowPath);
    }

    // 清理阶段输出
    const files = fs.readdirSync(this.phaseOutputsDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.phaseOutputsDir, file));
      }
    });

    return { success: true, message: 'Workflow reset successfully' };
  }

  /**
   * 检查阶段是否可以执行
   */
  canExecutePhase(phaseNumber) {
    const workflow = this.loadActiveWorkflow();
    if (!workflow) {
      return { can: false, reason: 'No active workflow' };
    }

    if (phaseNumber === 1) {
      // Phase 1 总是可以执行
      return { can: true };
    }

    // 检查前一个阶段是否完成
    const previousPhase = workflow.phases[`phase${phaseNumber - 1}`];
    if (previousPhase.status !== 'completed') {
      return {
        can: false,
        reason: `Phase ${phaseNumber - 1} must be completed first`
      };
    }

    return { can: true };
  }
}
