package ports

// GoogleOAuthPort — Port สำหรับ Google OAuth operations
type GoogleOAuthPort interface {
	GetAuthURL(state, redirectURI, scope string) string
	ExchangeCode(code, redirectURI string) (*TokenResponse, error)
	RefreshAccessToken(refreshToken string) (string, error)
	GetUserInfo(accessToken string) (*GoogleUserInfo, error)
	FetchGSCProperties(accessToken string) ([]GSCProperty, error)
}

type TokenResponse struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
}

type GoogleUserInfo struct {
	ID      string
	Email   string
	Name    string
	Picture string
}

type GSCProperty struct {
	SiteURL    string
	Permission string
}
