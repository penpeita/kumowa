# 固定パスワードと自動メールの設定でやんす

入口の固定パスワードとメール送信用の鍵は、別々に扱うでやんす。パスワード・宛先・送信鍵の実際の値は、この公開用の説明には書かないでやんす。

## 現在の状態でやんす

- 公開アプリは `https://penpeita.github.io/kumowa/` でやんす。公開ドメインからのパスワード照合とメール送信受付を実サーバーで確認したでやんす。開発専用の照合値は `.env.local` のみに残し、GitHub・配布ソース・本番ビルドから除外するでやんす。
- 本番はGitHub Pagesの画面から、`mail-worker/index.ts` の送信サービスに接続する設計でやんす。パスワードをサーバーで照合してから、一時的な認証を画面のメモリーだけに保持するでやんす。
- テスト10問の終了時だけ、コース・日時・正解数・各問題・選んだ答え・正解を自動送信するでやんす。練習・復習では送らないでやんす。
- Cloudflare Worker `kumowa-mail` を公開し、パスワード・送信キー・宛先など6設定をSecretに登録したでやんす。接続確認メールはResendで1通だけ表示され、Deliveredを確認したでやんす。受信箱のどのフォルダーに入ったかは未確認でやんす。
- 接続先は `https://kumowa-mail.yahoowaq.workers.dev` でやんす。APP_ORIGINは `https://penpeita.github.io` に切り替え済みで、Repository variableのREPORT_API_URLも登録済みでやんす。入口パスワード・送信キー・実際の宛先はGitHubへ登録していないでやんす。
- 現在の本番Workerはlocalhostからの接続を許可しないでやんす。ローカルの見た目や問題を開発するときは、開発環境だけでVITE_REPORT_API_URLを空にして開発用照合値を使うでやんす。実メールの確認は公開URLから行うでやんす。本番のAPP_ORIGINを開発用に書き換えないでやんす。

## 保管場所でやんす

| 設定 | 保管する場所 |
| --- | --- |
| APP_PASSWORD：入口の固定パスワード | WorkersのSecretでやんす |
| SESSION_SECRET：一時認証に使う32文字以上のランダムな鍵 | WorkersのSecretでやんす |
| RESEND_API_KEY：メールサービスの送信鍵 | WorkersのSecretでやんす |
| REPORT_TO：管理用メールの宛先 | WorkersのSecretでやんす |
| MAIL_FROM：確認済みの送信元アドレス | WorkersのSecretでやんす |
| APP_ORIGIN：PagesのURLのドメイン部分 | WorkersのSecretでやんす |
| REPORT_API_URL：公開したWorkerのHTTPS URL | GitHub ActionsのRepository variableでやんす |

このアプリの公開URLは `https://penpeita.github.io/kumowa/` で、APP_ORIGINは `https://penpeita.github.io` でやんす。REPORT_API_URLには `/login` や `/report` を付けないでやんす。このURL自体は公開してよい接続先でやんす。

## 設定担当者向け手順でやんす

CloudflareとResendの接続はユーザー承認済みで、両サービスへログイン済みでやんす。Cloudflareの配置用アクセス許可と、ResendのSending accessキー発行は本人が完了したでやんす。Resendの登録アドレスと管理用宛先が一致するため、送信元は `onboarding@resend.dev` の試用設定で接続したでやんす。新たな有料契約や支払いは行っていないでやんす。秘密値は公開コード・配布ZIPへ含めないでやんす。

初回配置では、この環境のWranglerがesbuildの親ディレクトリ探索で失敗したため、Viteで単一ファイルにまとめたWorkerをCloudflareの公式APIから配置したでやんす。APIで6設定がsecret_text、2つの回数制限がratelimitであることを確認したでやんす。初回の公開直後はTLS接続が通らず、反映後に正常になったでやんす。以後の更新では既存のSecretを保持するでやんす。

配布する2つのZIPに実際の秘密値と非公開設定が含まれないことを検査し、初回配置用の一時的な秘密設定ファイルは削除したでやんす。現在の値はWorkerのSecretで管理するでやんす。

1. CloudflareとResendのアカウントを用意するでやんす。Resendで送信用APIキーを作り、利用できる送信元を確認するでやんす。`onboarding@resend.dev` はResendアカウント本人の宛先への試用に限られるため、指定宛先との一致を確認するか、独自ドメインを認証するでやんす。
2. アプリのフォルダーで下記のログインとSecret設定を行うでやんす。値は各コマンドの入力画面へ入れるでやんす。SESSION_SECRETはパスワードとは別に、暗号学的乱数で生成した長い値にするでやんす。

```sh
npx wrangler login
npx wrangler secret put APP_PASSWORD --config mail-worker/wrangler.jsonc
npx wrangler secret put SESSION_SECRET --config mail-worker/wrangler.jsonc
npx wrangler secret put RESEND_API_KEY --config mail-worker/wrangler.jsonc
npx wrangler secret put REPORT_TO --config mail-worker/wrangler.jsonc
npx wrangler secret put MAIL_FROM --config mail-worker/wrangler.jsonc
npx wrangler secret put APP_ORIGIN --config mail-worker/wrangler.jsonc
npx wrangler deploy --config mail-worker/wrangler.jsonc
```

3. GitHubのSettings → Secrets and variables → Actions → Variablesに、REPORT_API_URLを登録するでやんす。送信用APIキーや入口のパスワードを `VITE_` 設定へ入れないでやんす。
4. 現在はgh-pagesブランチから公開しているでやんす。手動ワークフローを使う場合はPagesのSourceをGitHub Actionsへ変更してから実行するでやんす。READMEの更新手順に従い、公開ソースに秘密値が含まれないことを確認するでやんす。
5. 接続確認データでメールの配送完了と公開ドメインからの送信受付を確認済みでやんす。次は実際のテストを1回終え、画面の送信受付表示と指定メールの受信を確認するでやんす。子供の実際の操作とGmail受信箱内の表示位置は未確認でやんす。

## 仕組みと限界でやんす

- GitHub Pagesは静的ファイルの公開なので、問題集やプログラムそのものは閲覧できるでやんす。入口の画面だけで、全ファイルの厳密な非公開化はできないでやんす。固定の短い合言葉は、本人確認や強固なアクセス制限とは異なるでやんす。
- 送信サーバーは認証のない送信を拒否し、宛先はサーバー設定に固定するでやんす。ログインは1分に5回、送信は1分に12回をCloudflareの拠点ごとに制限するでやんす。これは全世界共通の厳密な上限ではないでやんす。
- 一時認証は12時間で失効し、再読み込みでも入口に戻るでやんす。パスワード変更で既存認証も無効になるでやんす。認証情報は端末の保存領域に書かないでやんす。
- 送信できない結果は端末に保存し、ログイン中は通信復帰・画面復帰・1分ごとの確認で自動再送するでやんす。画面を閉じた間には送れないでやんす。保存不可のときは画面を閉じると送信待ちの結果を失うため、その状態を表示するでやんす。
- 同じテストIDで再送し、Resendの24時間の重複防止期間より短い23時間以内に限って再試行するでやんす。期限を過ぎた未送信結果は自動送信せず、知らせるでやんす。未送信の記録は最大60件で、成功した記録は削除するでやんす。
- 「送信を受け付けた」はメールサービスが受理した意味でやんす。受信箱への到着までは保証せず、受信確認と必要に応じたResend側の配送状況確認を行うでやんす。
- 各コース1日3回は端末・ブラウザ内の記録で管理するでやんす。保存データの削除や別端末には引き継がれないでやんす。採点結果もブラウザで生成するため、厳密な不正防止や本人確認が必要になった場合はサーバーでの出題・採点・回数管理が別途必要でやんす。

## 参照した公式資料でやんす

- [GitHub Pagesの静的ホスティング](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)でやんす。
- [WorkersのSecret](https://developers.cloudflare.com/workers/configuration/secrets/)でやんす。
- [Workersの回数制限](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)でやんす。
- [Resendの送信API](https://resend.com/docs/api-reference/emails/send-email)でやんす。
- [Resendの重複送信防止](https://resend.com/docs/dashboard/emails/idempotency-keys)でやんす。
- [試用送信元の宛先制約](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)でやんす。
