import type { BusinessCalendar } from './business-calendar.js';
export interface WorkflowStep { id: string; label: string; requiredContent: string }
export interface Workflow { version: 1; type: string; steps: WorkflowStep[] }
export interface StepRecord extends WorkflowStep { startedAt: string; endedAt: string | null; content: string | null; actorSub: string }
export interface ProcessingState { status: 'WAITING' | 'IN_PROGRESS' | 'CLOSED'; version: number; workflow: Workflow | null; calendar: BusinessCalendar | null; steps: StepRecord[]; closedAt: string | null; result: string | null; slaDueAt: string | null; slaOverdue: boolean }
export type ProcessingAction = 'start' | 'start-step' | 'complete-step' | 'close';
export class ProcessingError extends Error { constructor(public readonly statusCode: number, message: string) { super(message); } }
export function workflowFor(type: string): Workflow {
  const definitions: Record<string, [string, string][]> = {
    'Khiếu nại': [['Tiếp nhận và xác minh', 'Nội dung xác minh'], ['Xử lý khiếu nại', 'Hành động xử lý'], ['Phản hồi kết quả', 'Kết quả phản hồi']],
    'Tư vấn': [['Xác định nhu cầu', 'Nhu cầu'], ['Chuẩn bị phương án', 'Phương án'], ['Tư vấn và xác nhận', 'Kết quả xác nhận']],
    'Bảo hành': [['Tiếp nhận sản phẩm', 'Thông tin tiếp nhận'], ['Kiểm tra', 'Chẩn đoán'], ['Thực hiện bảo hành', 'Hành động'], ['Kiểm tra kết quả', 'Kết quả cuối']],
  };
  if (!definitions[type]) throw new ProcessingError(422, 'Loại yêu cầu không có quy trình.');
  return { version: 1, type, steps: definitions[type].map(([label, requiredContent], i) => ({ id: String(i + 1), label, requiredContent })) };
}
export function applyProcessing(state: ProcessingState, input: { action: ProcessingAction; stepId?: string; content?: string; result?: string }, type: string, actorSub: string, now: string, calendar: BusinessCalendar): ProcessingState {
  const next = structuredClone(state);
  if (state.status === 'CLOSED') throw new ProcessingError(422, 'Ticket đã đóng, không thể sửa.');
  if (input.action === 'start') {
    if (state.status !== 'WAITING') throw new ProcessingError(422, 'Ticket đã bắt đầu.');
    next.status = 'IN_PROGRESS'; next.workflow = workflowFor(type); next.calendar = calendar;
    next.steps.push({ ...next.workflow.steps[0], startedAt: now, endedAt: null, content: null, actorSub });
  } else {
    if (state.status !== 'IN_PROGRESS' || !next.workflow) throw new ProcessingError(422, 'Hãy bắt đầu xử lý ticket.');
    const current = next.steps.at(-1);
    if (input.action === 'start-step') {
      const expected = next.workflow.steps[next.steps.length];
      if (!current?.endedAt || !expected || expected.id !== input.stepId || Date.parse(now) < Date.parse(current.endedAt)) throw new ProcessingError(422, 'Hãy thực hiện bước tiếp theo đúng thứ tự.');
      next.steps.push({ ...expected, startedAt: now, endedAt: null, content: null, actorSub });
    } else if (input.action === 'complete-step') {
      if (!current || current.endedAt || current.id !== input.stepId || !input.content?.trim() || input.content.length > 10000 || Date.parse(now) < Date.parse(current.startedAt)) throw new ProcessingError(422, 'Bước hoặc nội dung không hợp lệ.');
      current.endedAt = now; current.content = input.content.trim(); current.actorSub = actorSub;
    } else if (input.action === 'close') {
      if (next.steps.length !== next.workflow.steps.length || !current?.endedAt || !input.result?.trim() || input.result.length > 10000 || Date.parse(now) < Date.parse(current.endedAt)) throw new ProcessingError(422, 'Hoàn tất các bước và nhập kết quả tổng kết trước khi đóng.');
      next.status = 'CLOSED'; next.closedAt = now; next.result = input.result.trim();
    } else throw new ProcessingError(422, 'Lệnh không hợp lệ.');
  }
  next.version++; return next;
}
