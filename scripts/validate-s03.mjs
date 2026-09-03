import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readJson = (path) => JSON.parse(readFileSync(resolve(path), "utf8"));
const scenario = readJson("content/scenarios/startup-scenario.v1.json");
const outcomes = readJson(
  "content/scenarios/startup-outcome-templates.v1.json"
);
const evidence = readJson("content/evidence/source-cards.json");

const dimensions = Object.keys(scenario.stateModel?.dimensions ?? {});
const sourceIds = new Set(evidence.cards.map((card) => card.id));
const errors = [];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const validateSources = (ids, owner) => {
  assert(Array.isArray(ids) && ids.length > 0, `${owner}: sourceIds 不能为空`);
  for (const id of ids ?? []) {
    assert(sourceIds.has(id), `${owner}: 未知来源 ${id}`);
  }
};

assert(scenario.schemaVersion === 1, "scenario schemaVersion 应为 1");
assert(outcomes.schemaVersion === 1, "outcomes schemaVersion 应为 1");
assert(
  scenario.scenarioId === outcomes.scenarioId,
  "两个内容包 scenarioId 不一致"
);
assert(
  scenario.worlds.length === 3,
  `世界数量应为 3，实际 ${scenario.worlds.length}`
);
assert(dimensions.length > 0, "状态定义不能为空");

const worldIds = new Set();
const sceneIds = new Set();
const actionIds = new Set();
const echoTargets = [];
let sceneCount = 0;
let actionCount = 0;
let echoCount = 0;

for (const world of scenario.worlds) {
  assert(!worldIds.has(world.id), `世界 ID 重复: ${world.id}`);
  worldIds.add(world.id);
  assert(world.startingPoint?.length > 0, `${world.id}: 缺少叙事起点`);
  assert(world.acts.length === 3, `${world.id}: 幕数应为 3`);
  assert(
    dimensions.every((key) => Number.isFinite(world.initialState[key])),
    `${world.id}: 初始状态缺少六维数值`
  );

  world.acts.forEach((scene, index) => {
    sceneCount += 1;
    assert(scene.act === index + 1, `${scene.id}: 时间线顺序错误`);
    assert(!sceneIds.has(scene.id), `场景 ID 重复: ${scene.id}`);
    sceneIds.add(scene.id);
    assert(
      scene.fallbackNarrative?.length >= 40,
      `${scene.id}: 离线场景叙事过短`
    );
    assert(scene.actions.length === 3, `${scene.id}: 选择数量应为 3`);
    validateSources(scene.sourceIds, scene.id);

    const echoEntries = Object.entries(scene.echoes ?? {});
    assert(echoEntries.length === 2, `${scene.id}: 应有另外两条世界回声`);
    for (const [targetWorld, echo] of echoEntries) {
      echoCount += 1;
      echoTargets.push({
        sceneId: scene.id,
        sourceWorld: world.id,
        targetWorld
      });
      assert(targetWorld !== world.id, `${scene.id}: 回声不能指向当前世界`);
      assert(
        echo.title?.length > 0 && echo.text?.length >= 20,
        `${scene.id}->${targetWorld}: 回声不完整`
      );
      validateSources(echo.sourceIds, `${scene.id}->${targetWorld}`);
    }

    for (const action of scene.actions) {
      actionCount += 1;
      assert(!actionIds.has(action.id), `选择 ID 重复: ${action.id}`);
      actionIds.add(action.id);
      assert(
        dimensions.every((key) => Number.isFinite(action.delta[key])),
        `${action.id}: 六维增量不完整`
      );
      assert(
        Object.keys(action.delta).length === dimensions.length,
        `${action.id}: 存在额外或缺失的状态维度`
      );
      assert(action.benefits?.length >= 1, `${action.id}: 缺少收益`);
      assert(action.costs?.length >= 1, `${action.id}: 缺少代价`);
      const consequenceCount =
        (action.addFacts?.length ?? 0) +
        (action.addCommitments?.length ?? 0) +
        (action.irreversibleEvents?.length ?? 0);
      assert(consequenceCount >= 1, `${action.id}: 缺少事实、承诺或不可逆事件`);
      assert(
        action.fallbackOutcome?.length >= 50,
        `${action.id}: 离线结果叙事过短`
      );
      validateSources(action.sourceIds, action.id);
    }
  });
}

assert(sceneCount === 9, `场景数量应为 9，实际 ${sceneCount}`);
assert(actionCount === 27, `选择数量应为 27，实际 ${actionCount}`);
assert(echoCount === 18, `分岔回声数量应为 18，实际 ${echoCount}`);
for (const echo of echoTargets) {
  assert(
    worldIds.has(echo.targetWorld),
    `${echo.sceneId}: 回声指向未知世界 ${echo.targetWorld}`
  );
}

assert(
  outcomes.assumptionBlasts.length === 3,
  `想法检验包应为 3，实际 ${outcomes.assumptionBlasts.length}`
);
for (const blast of outcomes.assumptionBlasts) {
  validateSources(blast.sourceIds, blast.id);
  assert(
    blast.evidenceOptions?.length === 3,
    `${blast.id}: 想法检验线索应为 3 条`
  );
  assert(
    new Set(blast.evidenceOptions?.map((option) => option.id)).size === 3,
    `${blast.id}: 想法检验线索 ID 必须唯一`
  );
  assert(
    ["supported", "contradicted", "inconclusive"].every(
      (kind) => blast.outcomes?.[kind]
    ),
    `${blast.id}: 必须同时配置成立、不成立和不确定结果`
  );
  assert(
    blast.evidenceOptions?.every((option) =>
      ["supported", "contradicted", "inconclusive"].includes(option.result)
    ),
    `${blast.id}: 线索结果类型无效`
  );
  assert(
    blast.outcomes?.supported?.stateEffect === "keep" &&
      blast.outcomes?.contradicted?.stateEffect === "reversal" &&
      blast.outcomes?.inconclusive?.stateEffect === "uncertain",
    `${blast.id}: 三种结果的状态效果配置不正确`
  );
  assert(blast.realityTest?.length === 3, `${blast.id}: 现实验证步骤应为 3`);
  for (const worldId of worldIds) {
    assert(
      dimensions.every((key) =>
        Number.isFinite(blast.deltaByWorld?.[worldId]?.[key])
      ),
      `${blast.id}/${worldId}: 六维击穿增量不完整`
    );
    assert(
      blast.addedFactsByWorld?.[worldId]?.length > 0,
      `${blast.id}/${worldId}: 缺少新增事实`
    );
    assert(
      blast.irreversibleEventsByWorld?.[worldId]?.length > 0,
      `${blast.id}/${worldId}: 缺少不可逆后果`
    );
    assert(
      blast.fallbackNarrativeByWorld?.[worldId]?.length >= 40,
      `${blast.id}/${worldId}: 离线击穿叙事过短`
    );
  }
}

assert(
  outcomes.blindSpots.length >= 9,
  `盲点模板至少 9，实际 ${outcomes.blindSpots.length}`
);
assert(
  outcomes.futureLetters.length >= 9,
  `未来信模板至少 9，实际 ${outcomes.futureLetters.length}`
);
assert(
  outcomes.sevenDayExperiments.length >= 9,
  `七日实验模板至少 9，实际 ${outcomes.sevenDayExperiments.length}`
);

for (const item of [
  ...outcomes.blindSpots,
  ...outcomes.futureLetters,
  ...outcomes.sevenDayExperiments
]) {
  validateSources(item.sourceIds, item.id);
  for (const actionId of item.triggerActionIds ?? []) {
    assert(actionIds.has(actionId), `${item.id}: 未知触发选择 ${actionId}`);
  }
}

for (const letter of outcomes.futureLetters) {
  assert(
    worldIds.has(letter.worldId),
    `${letter.id}: 未知世界 ${letter.worldId}`
  );
  assert(letter.template?.length >= 50, `${letter.id}: 未来信模板过短`);
}

for (const experiment of outcomes.sevenDayExperiments) {
  assert(
    experiment.steps?.length === 3,
    `${experiment.id}: 七日实验步骤应为 3`
  );
  assert(
    experiment.nextStep?.supported &&
      experiment.nextStep?.contradicted &&
      experiment.nextStep?.inconclusive,
    `${experiment.id}: 缺少三种反馈的下一步建议`
  );
  assert(experiment.exitRule?.length > 0, `${experiment.id}: 缺少退出规则`);
}

if (errors.length > 0) {
  console.error(`S03 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("S03 validation passed");
console.log(
  JSON.stringify(
    {
      worlds: scenario.worlds.length,
      scenes: sceneCount,
      actions: actionCount,
      dimensions: dimensions.length,
      echoes: echoCount,
      assumptionBlasts: outcomes.assumptionBlasts.length,
      blindSpots: outcomes.blindSpots.length,
      futureLetters: outcomes.futureLetters.length,
      sevenDayExperiments: outcomes.sevenDayExperiments.length,
      evidenceSources: sourceIds.size
    },
    null,
    2
  )
);
