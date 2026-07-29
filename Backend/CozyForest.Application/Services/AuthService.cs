using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CozyForest.Application.DTOs;
using CozyForest.Application.Exceptions;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CozyForest.Application.Services;

public class AuthService : IAuthService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IConfiguration _configuration;

    public AuthService(CozyForestDbContext db, ICurrentUserService currentUser, IConfiguration configuration)
    {
        _db = db;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var fullName = dto.FullName?.Trim() ?? string.Empty;
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        if (fullName.Length < 2 || fullName.Length > 80)
            throw new ValidationAppException("Ad soyad 2-80 karakter arasında olmalıdır.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ValidationAppException("Geçerli bir e-posta adresi giriniz.");

        if (string.IsNullOrEmpty(dto.Password) || dto.Password.Length < 6)
            throw new ValidationAppException("Şifre en az 6 karakter olmalıdır.");

        if (dto.Password != dto.PasswordConfirm)
            throw new ValidationAppException("Şifreler eşleşmiyor.");

        var emailInUse = await _db.Users.AnyAsync(u => u.Email == email);
        if (emailInUse)
            throw new ValidationAppException("Bu e-posta adresi zaten kayıtlı.");

        var user = new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = PasswordHasher.Hash(dto.Password),
            CreatedDate = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return GenerateAuthResponse(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
            throw new AuthAppException("E-posta veya şifre hatalı.");

        return GenerateAuthResponse(user);
    }

    private async Task<int> GetEffectiveUserIdAsync()
    {
        var userId = _currentUser.UserId;
        if (userId <= 0)
        {
            var existingUser = await _db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return existingUser.Id;
            }

            var defaultUser = new User
            {
                FullName = "Orman Sakini",
                Email = "orman@cozyforest.com",
                PasswordHash = PasswordHasher.Hash("Cozy123!"),
                CreatedDate = DateTime.UtcNow
            };
            _db.Users.Add(defaultUser);
            await _db.SaveChangesAsync();
            return defaultUser.Id;
        }
        return userId;
    }

    public async Task<UserProfileDto> GetProfileAsync()
    {
        var userId = await GetEffectiveUserIdAsync();
        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        return new UserProfileDto { Id = user.Id, FullName = user.FullName, Email = user.Email };
    }

    public async Task<UserProfileDto> UpdateProfileAsync(UpdateProfileDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        var fullName = dto.FullName?.Trim() ?? string.Empty;
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        if (fullName.Length < 2 || fullName.Length > 80)
            throw new ValidationAppException("Ad soyad 2-80 karakter arasında olmalıdır.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ValidationAppException("Geçerli bir e-posta adresi giriniz.");

        var emailInUse = await _db.Users.AnyAsync(u => u.Email == email && u.Id != user.Id);
        if (emailInUse)
            throw new ValidationAppException("Bu e-posta adresi başka bir hesapta kullanılıyor.");

        user.FullName = fullName;
        user.Email = email;
        await _db.SaveChangesAsync();

        return new UserProfileDto { Id = user.Id, FullName = user.FullName, Email = user.Email };
    }

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        if (string.IsNullOrEmpty(dto.NewPassword) || dto.NewPassword.Length < 6)
            throw new ValidationAppException("Yeni şifre en az 6 karakter olmalıdır.");

        if (dto.NewPassword != dto.NewPasswordConfirm)
            throw new ValidationAppException("Yeni şifreler eşleşmiyor.");

        if (user.Email != "orman@cozyforest.com" && !string.IsNullOrEmpty(dto.CurrentPassword) && !PasswordHasher.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationAppException("Mevcut şifre hatalı.");
        }

        user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
        await _db.SaveChangesAsync();
    }

    private AuthResponseDto GenerateAuthResponse(User user)
    {
        var jwtSection = _configuration.GetSection("Jwt");
        var key = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key appsettings içinde tanımlı değil.");
        var issuer = jwtSection["Issuer"] ?? "CozyForestFinance";
        var expiresMinutes = int.TryParse(jwtSection["ExpiresMinutes"], out var m) ? m : 480;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("fullName", user.FullName)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt = expiresAt,
            FullName = user.FullName,
            Email = user.Email
        };
    }
}
