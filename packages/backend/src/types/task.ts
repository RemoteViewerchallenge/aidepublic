/**
 * @file Defines the data structure for a Task, the basic unit of work for an agent.
 */

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

/**
 * Represents a single, discrete unit of work to be performed by an agent.
 */
export interface Task {
  /** A unique identifier for the task. */
  id: string;

  /** A high-level description of the task's objective. */
  description: string;

  /** The current status of the task. */
  status: TaskStatus;

  /** The final result or output of the task, if completed. */
  result?: string;
}