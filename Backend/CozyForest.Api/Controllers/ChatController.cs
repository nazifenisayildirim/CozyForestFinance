using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CozyForest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class ChatController : ControllerBase
{
    private readonly IAiChatService _aiChatService;

    public ChatController(IAiChatService aiChatService)
    {
        _aiChatService = aiChatService;
    }

    [HttpPost("ask")]
    public async Task<ActionResult<ApiResponse<ChatResponseDto>>> Ask([FromBody] ChatRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(ApiResponse<ChatResponseDto>.Fail("Mesaj alanı boş olamaz."));
        }

        var result = await _aiChatService.AskAsync(dto);
        return Ok(ApiResponse<ChatResponseDto>.Ok(result));
    }
}
