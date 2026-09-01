package utils

import (
	"crypto/rand"
	"math/big"
)

const alphanumeric = "abcdefghjkmnpqrstuvwxyz23456789"

func GenerateRandomString(n int) string {
	result := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphanumeric))))
		if err != nil {
			result[i] = alphanumeric[i%len(alphanumeric)]
			continue
		}
		result[i] = alphanumeric[num.Int64()]
	}
	return string(result)
}
