using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CozyForest.Application.Interfaces;

namespace CozyForest.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }


    public int UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return 0;

            var claimVal = user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                        ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? user.FindFirst("sub")?.Value
                        ?? user.FindFirst("nameid")?.Value;

            return int.TryParse(claimVal, out var id) ? id : 0;
        }
    }
}