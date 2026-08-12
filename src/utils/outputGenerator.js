/**
 * 生成工分输出文本
 * 统一格式：按作业组（车号）分组，每组序号从1开始
 * 格式：[车号]\n[当天序号]、（[工步序号]*[数量]）[内容][数量][单位]（[时间或编号]）
 * 无车号的作业组不显示车号标题行，直接列工步
 * 临修格式：[当天序号]、（[工步序号]*1.5*[数量]）临修[内容][数量][单位]（[编号]）
 */

// 将时间格式中的冒号转为点（8:30 → 8.30）
function formatTime(timeRange) {
  if (!timeRange) return '';
  return timeRange.replace(/:/g, '.');
}

/**
 * 生成单个作业组的文本
 * @param {Object} group 作业组 { train, isLinxiu, items }
 * @returns {string} 该作业组的文本（不含尾随换行）
 */
function generateGroupText(group) {
  if (!group || !group.items || group.items.length === 0) return '';

  const isLinxiu = group.isLinxiu;
  const train = group.train || '';
  const lines = [];

  // 有车号才显示车号标题行
  if (train) {
    lines.push(train);
  }

  // 每个工步行
  group.items.forEach((item, index) => {
    const daySeq = index + 1;
    const content = item.content || item.name;
    const qty = item.quantity;
    const unit = item.unit || '';

    // 序号、（工步序号*数量）
    let line = `${daySeq}、（${item.seq}*`;

    if (isLinxiu) {
      // 临修格式：（工步序号*1.5*数量）
      line += `1.5*${qty}）临修${content}`;
    } else {
      // 普通格式：（工步序号*数量）
      line += `${qty}）${content}`;
    }

    // 内容后加*数量
    line += `*${qty}`;

    // 括号内放时间或编号
    const timeStr = formatTime(item.timeRange);
    const bianhaoStr = item.bianhao || '';

    if (timeStr && bianhaoStr) {
      // 两者都有：分别用括号
      line += `（${timeStr}）（${bianhaoStr}）`;
    } else if (timeStr) {
      line += `（${timeStr}）`;
    } else if (bianhaoStr) {
      line += `（${bianhaoStr}）`;
    }

    // 行尾加单项工分标记
    const singleScore = isLinxiu ? item.score * 1.5 : item.score;
    line += ` [单项：${formatScore(singleScore)}]`;

    lines.push(line);
  });

  return lines.join('\n');
}

/**
 * 生成所有作业组的完整输出文本
 * @param {Array} workGroups 作业组数组
 * @returns {string}
 */
export function generateOutput(workGroups) {
  if (!workGroups || workGroups.length === 0) return '';

  const parts = [];
  for (const group of workGroups) {
    const text = generateGroupText(group);
    if (text) parts.push(text);
  }

  return parts.join('\n\n');
}

/**
 * 格式化工分显示：整数不显示小数点，小数保留1位
 */
export function formatScore(score) {
  if (score % 1 === 0) return String(score);
  return score.toFixed(1);
}

/**
 * 计算单个作业组的工分
 */
export function calculateGroupScore(group) {
  if (!group) return 0;
  const multiplier = group.isLinxiu ? 1.5 : 1;
  return group.items.reduce(
    (sum, item) => sum + item.score * item.quantity * multiplier,
    0
  );
}

/**
 * 计算所有作业组的总工分
 */
export function calculateTotalScore(workGroups) {
  if (!workGroups || workGroups.length === 0) return 0;
  return workGroups.reduce((sum, g) => sum + calculateGroupScore(g), 0);
}
