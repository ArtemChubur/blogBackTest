const errorMessages = new Map([
  ['Invalid credentials', 'Неверный логин или пароль'],
  ['Invalid old password', 'Старый пароль указан неверно'],
  ['User not found', 'Пользователь не найден'],
  ['Invalid refresh token', 'Недействительный refresh-токен'],
  ['Access token required', 'Требуется access-токен'],
  ['Invalid or expired token', 'Недействительный или просроченный токен'],
  ['Refresh token required', 'Требуется refresh-токен'],
  ['Invalid or expired refresh token', 'Недействительный или просроченный refresh-токен'],
  ['Admin access required', 'Требуются права администратора'],
  ['Internal server error', 'Внутренняя ошибка сервера'],
  ['Logged out', 'Выход выполнен'],
  ['Password changed', 'Пароль изменён'],
  ['User deleted', 'Пользователь удалён'],
  ['Post deleted', 'Пост удалён'],
  ['Reaction updated', 'Реакция обновлена'],
  ['Invalid file type', 'Неверный формат файла'],
  ['Not allowed by CORS', 'Запрос с этого источника запрещён'],
  ['jwt malformed', 'Недействительный токен'],
  ['invalid signature', 'Недействительный токен'],
  ['jwt expired', 'Срок действия токена истёк'],
  ['invalid token', 'Недействительный токен'],
]);

const hasCyrillic = (value) => /[А-Яа-яЁё]/.test(value);

const translateErrorMessage = (error, fallback = 'Произошла ошибка') => {
  if (!error) {
    return fallback;
  }

  const rawMessage = typeof error === 'string' ? error : error.message;
  if (rawMessage && errorMessages.has(rawMessage)) {
    return errorMessages.get(rawMessage);
  }

  const code = typeof error === 'object' ? error.code : undefined;
  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return 'Файл слишком большой. Максимальный размер - 10 МБ.';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Слишком много файлов или неверное поле загрузки.';
    case '23505':
      return 'Такие данные уже существуют.';
    case '23503':
      return 'Связанная запись не найдена.';
    case '23514':
      return 'Переданы некорректные данные.';
    default:
      break;
  }

  if (rawMessage) {
    if (hasCyrillic(rawMessage)) {
      return rawMessage;
    }
  }

  return fallback;
};

const getErrorStatus = (error, fallback = 500) => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  if (error.message === 'Not allowed by CORS' || error.message === 'Запрос с этого источника запрещён') {
    return 403;
  }

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return 413;
    case 'LIMIT_UNEXPECTED_FILE':
      return 400;
    case '23505':
    case '23503':
    case '23514':
      return 400;
    default:
      break;
  }

  return error.statusCode || error.status || fallback;
};

module.exports = {
  translateErrorMessage,
  getErrorStatus,
};
