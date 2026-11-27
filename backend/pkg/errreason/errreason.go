package errreason

import "strings"

// Of возвращает причину ошибки вида kind без технических обёрток вокруг неё.
//
// Ошибки собираются как errors.Join(kind, причина), а каждый слой дописывает свой
// контекст через fmt.Errorf. Этот контекст нужен в логах, но не человеку: ему
// показывается только причина рядом с kind. Если причины нет, отдаётся сам kind.
func Of(err, kind error) string {
	if reason, ok := find(err, kind); ok {
		return reason
	}

	return kind.Error()
}

func find(err, kind error) (string, bool) {
	switch e := err.(type) { //nolint:errorlint // нужен обход дерева, а не поиск одного вида
	case interface{ Unwrap() []error }:
		members := e.Unwrap()

		reasons := make([]string, 0, len(members))
		isKind := false

		for _, member := range members {
			// Точное совпадение, а не errors.Is: errors.Is нашёл бы kind и в элементе,
			// который содержит его глубже, и причиной стали бы соседние ошибки.
			if member == kind { //nolint:errorlint
				isKind = true

				continue
			}

			reasons = append(reasons, member.Error())
		}

		if isKind {
			if len(reasons) == 0 {
				return kind.Error(), true
			}

			return strings.Join(reasons, "; "), true
		}

		for _, member := range members {
			if reason, ok := find(member, kind); ok {
				return reason, true
			}
		}
	case interface{ Unwrap() error }:
		return find(e.Unwrap(), kind)
	}

	return "", false
}
