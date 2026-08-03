# taskboard-mobile

既存Webアプリ [`taskboard`](../taskboard) のAndroid版。React Native (Expo) 製のカンバン式タスク管理アプリ。

## ⚠️ このプロジェクトを日本語を含むパスへ置かないこと

この端末の **Node 22.13.1 は、非ASCII文字を含むパスから `require()` すると
アクセス違反 (0xC0000005) でクラッシュする**。当初 `C:\Users\shogo\ドキュメント\Projects\`
配下に作ったところ `npx expo` も `tsc` も起動できなかったため、
`C:\Projects\taskboard-mobile` へ移動してある。

再現：

```powershell
node -e "require('C:/Users/shogo/ドキュメント/なにか/node_modules/ms')"  # segfault
node -e "require('C:/Projects/taskboard-mobile/node_modules/ms')"        # OK
```

Nodeを 22.14 以降（または最新のLTS）へ更新すれば解消するはずだが、
未検証なのでASCIIパスのまま運用するのが安全。

## セットアップ

```powershell
npm install
npx expo start          # Expo Go か開発ビルドで読み込む
npx expo run:android    # ネイティブビルド
```

## 構成

```
App.tsx                       ナビゲーション（Bottom Tab + Stack）
src/
├── theme.ts                  カラーパレット（Web版 tailwind.config.ts と同じ値）
├── types/task.ts             データモデル
├── lib/
│   ├── storage.ts            BoardRepository（インターフェース + AsyncStorage実装）
│   ├── subtasks.ts           サブタスクツリーの再帰操作
│   ├── seed.ts               初期ステータス・タグ
│   └── uid.ts                ID生成
├── store/BoardContext.tsx    アプリ全体の状態
├── navigation/types.ts       画面パラメータの型
├── components/
│   ├── TaskCard.tsx          タスクカード（スワイプで移動・削除）
│   ├── StatusTab.tsx         ステータスタブ
│   ├── SubTaskItem.tsx       サブタスク1行
│   ├── StatusPickerSheet.tsx 移動先選択シート
│   ├── TagChip.tsx           タグチップ
│   └── ui.tsx                Button / Field / Section
└── screens/
    ├── KanbanScreen.tsx      メイン。タブ切替＋D&D並び替え＋FAB
    ├── TaskDetailScreen.tsx  編集・サブタスク・削除
    ├── AddTaskScreen.tsx     新規追加
    └── SettingsScreen.tsx    ステータス／タグ管理・データ削除
```

## データの持ち方

**端末内のAsyncStorageのみ**（キー `taskboard_mobile_v1`）。ログイン画面は無い。

当初の仕様書は「Supabaseを既存Webアプリと共通で使う」前提だったが、
Web版を確認したところSupabaseは導入されておらず（localStorageのみ）、
共通のバックエンドが存在しなかったため、まずローカル保存で作っている。

### Supabaseへ移行するとき

画面のコードは `src/lib/storage.ts` の `BoardRepository`
インターフェースにしか依存していない。同じシグネチャの
`SupabaseBoardRepository` を実装して、ファイル末尾の

```ts
export const repository: BoardRepository = new AsyncStorageBoardRepository();
```

を差し替えれば、画面側は変更不要。

モデルは移行を見越した形にしてある：

- `status_id` / `position` / `created_at` / `updated_at` と snake_case
- `user_id` フィールド（ローカルでは常に `null`、RLS用に確保）
- ステータス・タグはそれぞれ独立したレコード（テーブル化しやすい）
- `subtasks` / `tags` / `links` はJSONB想定のネスト構造

Web版とはモデルが非互換（Web版は `status: 'todo'|...` のリテラル型、
`tags: TagId[]`、`SubTask.done/.subtasks`）なので、
データを引き継ぐ場合は変換が必要。

## 操作

| 操作 | 動き |
|---|---|
| タブをタップ | ステータス列の切り替え |
| カードをタップ | 詳細画面へ |
| カードを長押し | ドラッグで列内の並び替え |
| カードを左スワイプ | 「移動」（他の列へ）／「削除」 |
| 右下のFAB | タスク追加 |

## 技術スタック

- Expo SDK 57 / React Native 0.86 / React 19.2
- TypeScript strict
- React Navigation 7（Bottom Tab + Native Stack）
- react-native-draggable-flatlist 4.0.3（タッチD&D）
- react-native-reanimated 4.5.1 + react-native-gesture-handler 2.32
- @react-native-async-storage/async-storage 2.2.0

バージョンはExpo SDK 57の推奨に揃えてある（`npx expo install --check` で確認済み）。
