export interface FlatDialogNode {
  type: "npc" | "pc";
  index: number;
  text: string;
  script?: string;
  condition?: string;
  children: FlatDialogNode[];
  isLeaf: boolean;
  /** Native journal-advance fields (Quest/QuestEntry) — set with no script at all. */
  quest?: string;
  questEntry?: number;
  /** EE script parameters, read as plain Key->Value maps; omitted when empty. */
  actionParams?: Record<string, string>;
  conditionParams?: Record<string, string>;
}

export interface DialogPath {
  nodes: Array<{
    type: "npc" | "pc";
    index: number;
    text: string;
    script?: string;
  }>;
}

export interface DialogScriptRef {
  dialog: string;
  nodeType: "entry" | "reply";
  nodeIndex: number;
  fieldName: string;
  scriptResref: string;
  text: string;
}
