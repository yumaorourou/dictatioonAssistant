/** 批量输入解析：支持逗号、顿号、空格、换行分隔 */
export function parseBatchInput(text: string): string[] {
  return text
    .split(/[,，、\s\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
