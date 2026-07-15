window.onload = function () {
    $('.current-year').text(new Date().getFullYear());

    if (typeof window.APP_CONFIG.client !== 'undefined' && window.APP_CONFIG.client !== '') {
        $('.client-name').text(window.APP_CONFIG.client);
    }

    if (typeof window.APP_CONFIG.clientLogo !== 'undefined' && window.APP_CONFIG.clientLogo !== '') {
        const logo = './img/client_logo/' + window.APP_CONFIG.clientLogo;
        $('.logo_img').attr('src', logo);
        $('.logo_img').show();
    }

    document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        sendForm();
    });
}

function togglePass() {
    const input = document.getElementById('inp_pass');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function setCookie(name, value, expires, path, domain, secure, httpOnly) {
    document.cookie = name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires : "") +
        ((path) ? "; path=" + path : "") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "") +
        ((httpOnly) ? "; httpOnly" : "");
}

function delCookie(name) {
    document.cookie = name + "=" + "; expires=Thu, 01 Jan 1970 00:00:01 GMT";
}

function localeOnSubmit() {
    date = new Date();
    date.setHours(date.getHours() + 1);
    setCookie('monitSubmit', 'ua', date.toUTCString(), false, false, true, true);
}

function sendForm() {
    let login = $("#inp_login").val();
    let password = $("#inp_pass").val();

    $.ajax({
        type: 'POST',
        url: "app/login.php",
        headers: {
            "Authorization": "Bearer " + window.btoa(encodeURIComponent(`${login}:${password}`)),
        },
        contentType: 'application/x-www-form-urlencoded',
        success: function (response) {
            if (!response.success) {
                showError(response);
            } else {
                window.location.replace('./index.html');
            }
        },
        error: function (xhr, status, error) {
            console.log(xhr.responseText);
        }
    });
}

function showError(data) {
    swal({
        title: 'Error message',
        text: data.message,
        type: "error",
        showCancelButton: false,
        confirmButtonColor: "#DD6B55",
    });
}