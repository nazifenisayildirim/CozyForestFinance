using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface ITransactionService
{
    Task<PagedResult<TransactionListDto>> GetAllAsync(TransactionFilterDto filter);
    Task<TransactionDetailDto> GetByIdAsync(int id);
    Task<TransactionDetailDto> CreateAsync(TransactionCreateDto dto);
    Task<TransactionDetailDto> UpdateAsync(int id, TransactionUpdateDto dto);
    Task DeleteAsync(int id);
}
