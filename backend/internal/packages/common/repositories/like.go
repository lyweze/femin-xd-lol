package repositories

import "strings"

//nolint:gochecknoglobals
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// ContainsPattern шаблон ILIKE для поиска подстроки: % и _ из запроса ищутся как обычные символы.
func ContainsPattern(search string) string {
	return "%" + likeEscaper.Replace(search) + "%"
}
