export type WorkspaceTask = {
  id: number;
  title: string;
  area: string;
  done: boolean;
};

export const initialTasks: WorkspaceTask[] = [
  { id: 1, title: "Define the next milestone", area: "Strategy", done: false },
  { id: 2, title: "Review product requirements", area: "Product", done: true },
  { id: 3, title: "Prepare the weekly execution plan", area: "Operations", done: false }
];