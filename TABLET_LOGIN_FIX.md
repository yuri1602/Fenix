# Поправка на проблема с логин на таблети
## Дата: 15.10.2025

### Проблем:
При отваряне на сайта през таблет, след успешен логин, потребителят се връща обратно на логин формата.

### Причина:
Проблемът е свързан с cookies и сесиите на мобилни устройства. По подразбиране, Flask не конфигурира сесийните cookies оптимално за мобилни браузъри.

### Решение:

#### 1. Конфигурация на Flask сесиите (app.py)
Добавени следните настройки:
```python
app.config['SESSION_COOKIE_SECURE'] = False  # False за HTTP, True за HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Защита от XSS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Позволява cookies от същия сайт
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # Сесията е валидна 24 часа
```

#### 2. Постоянни сесии (app.py)
При успешен логин сесията се маркира като постоянна:
```python
session.permanent = True  # Прави сесията persistent
```

#### 3. Fetch API с credentials (login.html)
Добавен параметър `credentials: 'same-origin'` към login заявката:
```javascript
const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'same-origin',  // Важно за cookies
    body: JSON.stringify({ username, password })
});
```

#### 4. Глобален fetch wrapper (fetch-wrapper.js)
Създаден нов файл `static/fetch-wrapper.js`, който автоматично:
- Добавя `credentials: 'same-origin'` към всички fetch заявки
- Пренасочва към `/login` при 401 грешка (изтекла сесия)

#### 5. Debug logging (app.py)
Добавени съобщения за debugging:
- При успешен логин се показва информация за сесията
- При проверка на сесията се показва дали е валидна или не

### Промени във файлове:

1. **app.py**
   - Импортиран `timedelta`
   - Добавени session configuration настройки
   - `session.permanent = True` при логин
   - Debug print съобщения

2. **templates/login.html**
   - Добавен `credentials: 'same-origin'` към fetch заявката
   - Добавен console.log за debugging

3. **templates/index.html**
   - Добавен script tag за `fetch-wrapper.js` в head секцията

4. **static/fetch-wrapper.js** (НОВ ФАЙЛ)
   - Глобален wrapper за fetch
   - Автоматично добавя credentials
   - Обработва 401 грешки

### Как да тествате:

1. Рестартирайте Flask сървъра
2. Отворете сайта от таблета
3. Влезте с admin/admin123
4. Проверете дали се пренасочва към началната страница
5. Проверете дали при refresh остава логнат
6. Проверете конзолата на браузъра за debug съобщения

### Допълнителни забележки:

- Ако използвате HTTPS, сменете `SESSION_COOKIE_SECURE` на `True`
- Ако използвате различен домейн, може да се наложи да промените `SESSION_COOKIE_SAMESITE`
- Debug съобщенията могат да бъдат премахнати след като всичко работи стабилно

### За production:

1. Сменете `SECRET_KEY` с произволен сигурен ключ
2. Използвайте HTTPS и сменете `SESSION_COOKIE_SECURE` на `True`
3. Премахнете debug print съобщенията
4. Добавете rate limiting на login endpoint-а
