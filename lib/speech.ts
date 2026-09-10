export function speechText(text: string): string {
  return text
    .replaceAll('くもわ', 'く、も、わ')
    .replace(/(\d+(?:\.\d+)?)\s*mL/g, '$1ミリリットル')
    .replace(/(\d+(?:\.\d+)?)\s*cm/g, '$1センチメートル')
    .replace(/(\d+(?:\.\d+)?)\s*L/g, '$1リットル')
    .replace(/(\d+(?:\.\d+)?)\s*g/g, '$1グラム')
    .replaceAll('何cm', 'なんセンチメートル')
    .replaceAll('何mL', 'なんミリリットル')
    .replaceAll('何L', 'なんリットル')
    .replaceAll('何g', 'なんグラム')
    .replaceAll('％', 'パーセント')
    .replaceAll('＋', 'たす')
    .replaceAll('−', 'ひく')
    .replaceAll('×', 'かける')
    .replaceAll('÷', 'わる');
}
