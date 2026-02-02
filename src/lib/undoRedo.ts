/**
 * Undo/Redo Manager for Spreadsheet Operations
 * Implements Command Pattern
 */

export interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

export class UndoRedoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize: number;

  constructor(maxStackSize: number = 100) {
    this.maxStackSize = maxStackSize;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    
    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new command is executed
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command ? command.description : null;
  }

  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command ? command.description : null;
  }
}

// Specific command types for spreadsheet operations

export interface CellEditCommandData {
  cellKey: string;
  oldValue: unknown;
  newValue: unknown;
  setCellData: (updates: Record<string, unknown>) => void;
}

export class CellEditCommand implements Command {
  description: string;
  
  constructor(private data: CellEditCommandData) {
    this.description = `Edit cell ${data.cellKey}`;
  }

  execute(): void {
    this.data.setCellData({ [this.data.cellKey]: this.data.newValue });
  }

  undo(): void {
    this.data.setCellData({ [this.data.cellKey]: this.data.oldValue });
  }
}

export interface StyleChangeCommandData {
  cellKeys: string[];
  oldStyles: Record<string, unknown>;
  newStyle: unknown;
  applyStyle: (cellKeys: string[], style: unknown) => void;
}

export class StyleChangeCommand implements Command {
  description: string;
  
  constructor(private data: StyleChangeCommandData) {
    this.description = `Style ${data.cellKeys.length} cells`;
  }

  execute(): void {
    this.data.applyStyle(this.data.cellKeys, this.data.newStyle);
  }

  undo(): void {
    this.data.cellKeys.forEach(key => {
      if (this.data.oldStyles[key]) {
        this.data.applyStyle([key], this.data.oldStyles[key]);
      }
    });
  }
}

export interface BulkEditCommandData {
  changes: Record<string, unknown>;
  setCellData: (updates: Record<string, unknown>) => void;
}

export class BulkEditCommand implements Command {
  description: string;
  
  constructor(private data: BulkEditCommandData) {
    this.description = `Edit ${Object.keys(data.changes).length} cells`;
  }

  execute(): void {
    this.data.setCellData(this.data.changes);
  }

  undo(): void {
    const undoChanges: Record<string, unknown> = {};
    Object.keys(this.data.changes).forEach(key => {
      undoChanges[key] = { value: '' }; // Restore to empty
    });
    this.data.setCellData(undoChanges);
  }
}
