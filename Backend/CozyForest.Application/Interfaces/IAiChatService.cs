using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface IAiChatService
{
    Task<ChatResponseDto> AskAsync(ChatRequestDto dto);
}
