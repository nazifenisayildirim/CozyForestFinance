using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CozyForest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/statistics")]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    // GET /api/statistics/summary?months=6
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<StatisticsSummaryDto>>> GetSummary([FromQuery] int months = 6)
    {
        var summary = await _statisticsService.GetSummaryAsync(months);
        return Ok(ApiResponse<StatisticsSummaryDto>.Ok(summary));
    }
}
