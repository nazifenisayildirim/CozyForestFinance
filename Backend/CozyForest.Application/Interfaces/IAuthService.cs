using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<UserProfileDto> GetProfileAsync();
    Task<UserProfileDto> UpdateProfileAsync(UpdateProfileDto dto);
    Task ChangePasswordAsync(ChangePasswordDto dto);
}
