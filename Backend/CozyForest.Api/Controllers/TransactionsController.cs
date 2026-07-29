using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CozyForest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/transactions")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    // GET /api/transactions?startDate=&endDate=&categoryId=&type=&page=&pageSize=
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<TransactionListDto>>>> GetAll(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? categoryId,
        [FromQuery] TransactionType? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var filter = new TransactionFilterDto
        {
            StartDate = startDate,
            EndDate = endDate,
            CategoryId = categoryId,
            Type = type,
            Page = page,
            PageSize = pageSize
        };

        var result = await _transactionService.GetAllAsync(filter);
        return Ok(ApiResponse<PagedResult<TransactionListDto>>.Ok(result));
    }

    // GET /api/transactions/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<TransactionDetailDto>>> GetById(int id)
    {
        var transaction = await _transactionService.GetByIdAsync(id);
        return Ok(ApiResponse<TransactionDetailDto>.Ok(transaction));
    }

    // POST /api/transactions
    [HttpPost]
    public async Task<ActionResult<ApiResponse<TransactionDetailDto>>> Create([FromBody] TransactionCreateDto dto)
    {
        var transaction = await _transactionService.CreateAsync(dto);
        var message = dto.Type == TransactionType.Income ? "Gelirin başarıyla kaydedildi." : "Harcamanı kaydettim.";
        return Ok(ApiResponse<TransactionDetailDto>.Ok(transaction, message));
    }

    // PUT /api/transactions/{id}
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<TransactionDetailDto>>> Update(int id, [FromBody] TransactionUpdateDto dto)
    {
        var transaction = await _transactionService.UpdateAsync(id, dto);
        return Ok(ApiResponse<TransactionDetailDto>.Ok(transaction, "İşlem güncellendi."));
    }

    // DELETE /api/transactions/{id}
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        await _transactionService.DeleteAsync(id);
        return Ok(ApiResponse<object>.Ok(new { }, "İşlem silindi."));
    }
}
