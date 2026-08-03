import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Kanban: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  TaskDetail: { taskId: string };
  /** 追加画面を開いたときに選択済みにしておくステータス */
  AddTask: { statusId?: string };
};
