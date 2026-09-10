# ヤンス君でやんす

## 採用した姿でやんす

ユーザー承認済みの2枚を `assets/yansu-correct.png` と `assets/yansu-wrong.png` に保存したでやんす。丸い2頭身、短めの出っ歯2本、目が見えない瓶底眼鏡、青いスカーフ、少し腰の低い見習い風のネズミでやんす。○は見る側の左、×は反対の手で見る側の右に持つでやんす。

練習・当日の復習では回答後に表示するでやんす。テスト中は正誤を見せず、最後の各問の振り返りで表示するでやんす。小さい画面では78px、通常は112px、振り返り一覧では42〜48pxで表示するでやんす。動きを減らす端末設定ではアニメーションを止めるでやんす。

画像はビルトインの画像生成ツールで作成し、最後に2枚ともユーザーの了承を受けたでやんす。APIやCLIによる画像生成は使っていないでやんす。背景は最終的に白で統一したでやんす。

## 声と音でやんす

- 「音と声」をオンにすると、正解では約1.25秒の華やかな音、不正解では約0.34秒の短い下降音を再生するでやんす。初期状態はオフでやんす。
- 決め台詞は「正解でやんす！」「外れでやんす！」でやんす。現在は端末の日本語読み上げを少し高めにして使うでやんす。端末によって声は異なり、対応する日本語音声が必要でやんす。
- テスト途中は声も正誤効果音も出さないでやんす。最後の総合得点には効果音だけを使い、1問でも間違いがあるだけで「外れ」と読み上げることはしないでやんす。
- 埋め込み用の録音が入っていれば、その録音を優先して再生するでやんす。`assets/yansu-voice-correct.mp3` と `assets/yansu-voice-wrong.mp3`、または同名の `.wav` を置いて再ビルドするでやんす。両方ある場合はmp3を優先するでやんす。録音がなければ不要な通信はせず端末の読み上げを使うでやんす。
- 録音作成用AIとして [VOICEVOX](https://voicevox.hiroshiba.jp/) を提案したでやんす。まだインストール・声の選定・生成はしていないでやんす。採用時は選んだ音声の規約に従って、必要なクレジットをアプリにも表示するでやんす。生成後の再生にはAIサービス接続やAPIキーは不要でやんす。

## 最終の編集プロンプトでやんす

下記をそれぞれ承認前の眼鏡付き画像に適用し、今回採用した2枚を生成したでやんす。

### ○の画像でやんす

```text
Precise small edit to this Yansu-kun mouse illustration: shorten BOTH visible white buck teeth by about 20 to 25 percent vertically. Keep two separate clear buck teeth, same widths and placement, just slightly shorter as requested. Preserve EVERYTHING else: exact round two-heads-tall body, warm gray mouse fur, cream belly, blue neckerchief, large bottle-bottom round glasses with opaque lenses HIDING ALL EYES, happy grin, big red hollow ○ on the paddle held on the VIEWER'S LEFT, same pose/hand, ears, tail, colors, clean bold navy outlines, and pure white background. No new details. Final correct-answer asset, full body and symbol uncropped.
```

### ×の画像でやんす

```text
Precise two changes to this Yansu-kun mouse illustration: (1) shorten BOTH visible white buck teeth by about 20 to 25 percent vertically, keeping two distinct buck teeth with same width. (2) SWITCH THE PADDLE TO THE OPPOSITE HAND. The blue × paddle is currently on the VIEWER'S LEFT; move it to the VIEWER'S RIGHT, held in the mouse's OTHER hand (the mouse's anatomical LEFT paw). The empty paw is now on the viewer's left, resting shyly near his belly. Keep the low dejected paddle position, large clear BLUE ×, and mild sad/sheepish posture. Preserve exact same original round TWO-HEADS tall gray mouse, cream belly, blue neckerchief, stubby feet, large opaque bottle-bottom spectacles HIDING ALL EYES, drooping ears, downturned mouth, long pink mouse tail, bold navy outlines, pure white background. Do not simply mirror the whole image: retain recognizable face/body/neck-scarf direction, change the arm/paddle pose. Make paddle unobstructed and entire body/ears/tail/symbol uncropped.
```
