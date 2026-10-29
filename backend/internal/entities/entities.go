package entities

import "fmt"

func NamerFunc(table string) func(string) string {
	return func(col string) string {
		return fmt.Sprintf("%s.%s", table, col)
	}
}
