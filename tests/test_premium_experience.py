"""Decision and presentation regressions from the premium UX review."""
import re
import pytest
from test_regressions import run_game_action_smoke


def test_overview_progress_matches_required_work_before_completion():
    output = run_game_action_smoke({
        'products': {'supportReplyAi': {'status': 'developing', 'progress': 135}},
    }, "window.__testApi.openProductDetailModal('supportReplyAi');")
    item = re.search(r'data-product-detail="supportReplyAi">(.*?)</button>', output['productHtml']).group(1)
    width = float(re.search(r'width:([\d.]+)%', item).group(1))
    assert width == pytest.approx(135 / 140 * 100)
    assert '96%' in output['productDetailHtml']


@pytest.mark.parametrize('product', [
    {'status': 'selling', 'customers': 20, 'productFire': 85},
    {'status': 'selling', 'customers': 20, 'churnRisk': 65},
    {'status': 'developing', 'bugs': 55},
])
def test_urgent_work_precedes_claimable_rewards_and_expansion(product):
    output = run_game_action_smoke({
        'money': 20000, 'totalMoney': 20000, 'companyLevel': 1,
        'employees': {'dev01': 1}, 'pendingDecisionEvent': None,
        'products': {'dailyReportAi': product},
    }, 'window.__testResult=window.__testApi.getNextRecommendation();')
    recommendation = output['testResult']
    assert recommendation['action'] == 'product'
    assert recommendation['taskId'] in ['crisis', 'support', 'qa']


def test_current_focus_compares_subscription_income_separately_from_old_sales():
    output = run_game_action_smoke({
        'products': {
            'dailyReportAi': {'status': 'selling', 'customers': 20},
            'slideKitAi': {'status': 'selling', 'unitsSold': 100, 'lifetimeRevenue': 980000},
        },
    }, 'window.__testResult={id:window.__testApi.EXPERIENCE.getFocusProductDefinition().id};')
    assert output['testResult']['id'] == 'dailyReportAi'
    assert '月額収入トップ' in output['primaryProductHtml']
    assert '累計ベストセラー' in output['primaryProductHtml']
    assert 'focusProductSelect' in output['primaryProductHtml']


def test_assignment_preview_explains_work_left_without_a_worker():
    output = run_game_action_smoke({
        'employees': {'dev01': 1},
        'products': {'dailyReportAi': {'status': 'developing'}},
        'assignments': {'development': {'productAssignments': {'dailyReportAi': {'aiIds': ['dev01']}}}},
    }, "window.__testResult={html:window.__testApi.EXPERIENCE.getAssignmentImpactHtml({taskId:'development',productId:'meetingMinutesAi',aiIds:['dev01']})};")
    assert 'AI日報メーカーの開発は担当不在になります' in output['testResult']['html']
    assert output['save']['assignments']['development']['productAssignments']['dailyReportAi']['aiIds'] == ['dev01']


def test_base_contract_income_does_not_finish_product_sales_onboarding():
    output = run_game_action_smoke({'employees': {'dev01': 1}, 'money': 100, 'totalMoney': 100},
                                 'window.__testResult={stage:window.__testApi.getTutorialStage()};')
    assert output['testResult']['stage'] == 2


def test_completed_product_guides_sales_even_after_development_worker_is_released():
    output = run_game_action_smoke({'employees': {'dev01': 1}, 'products': {'dailyReportAi': {'status': 'ready', 'progress': 100}}},
                                 'window.__testResult={stage:window.__testApi.getTutorialStage()};')
    assert output['testResult']['stage'] == 3


def test_employee_upgrade_preview_uses_runtime_and_does_not_spend_money():
    output = run_game_action_smoke({'employees': {'dev01': 2}, 'money': 1000, 'totalMoney': 1000},
                                 "window.__testResult={html:window.__testApi.EXPERIENCE.getEmployeeComparisonHtml('dev01')};")
    assert '4.4 → 5.1' in output['testResult']['html']
    assert '定期判定は1秒ごと' in output['testResult']['html']
    assert output['save']['money'] == 1000
    assert output['save']['employees']['dev01'] == 2


def test_failed_slot_save_reports_failure_and_preserves_current_save():
    output = run_game_action_smoke({'money': 1234, 'totalMoney': 1234}, """
window.__testApi.STORAGE.setItem = function () { throw new Error('quota exceeded'); };
window.__testResult={success:window.__testApi.saveToSlot('2')};
""")
    assert output['testResult']['success'] is False
    assert '保存できませんでした' in output['saveManagerStatus']
    assert output['save']['money'] == 1234
