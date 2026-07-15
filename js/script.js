try {
    const SETTINGS = {
        useBackend: false
    };
    const TASKS_PER_PAGE = 25;

    let titleBtnTheme = { 'dark': 'Перейти на світлий бік', 'light': "Перейти на темний бік" };
    let mockPeople = [];
    let peopleCount = 0;
    let selectedPersonId = null;
    let selectedPersonPosition = null;
    let currentSearchTask = '';
    let currentSearchPeople = '';
    let currentSearchPeopleModal = '';
    let currentStatusFilter = 1;
    let time_hide_dots_animation = 300;

    let paginationState = {
        page: 1,
        total: 0,
        totalPages: 0
    };

    let flatpickr_config = {
        enableTime: false,
        dateFormat: "Y-m-d",
        defaultDate: new Date(),
        minDate: new Date(),
        mode: "single",
        conjunction: ' — ',
        locale: 'uk'
    };

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    function apiPost(url, data, onSuccess) {
        const isFormData = data instanceof FormData;

        if (SETTINGS.useBackend) {
            $.ajax({
                url: url,
                method: 'POST',
                data: data,
                processData: !isFormData,
                contentType: isFormData ? false : 'application/x-www-form-urlencoded; charset=UTF-8',
                dataType: 'json',
                success: function (res) {
                    if (res.message === 'unauthorized') {
                        window.location.replace('./login.html');
                        return;
                    }
                    onSuccess(res);
                },
                error: function (xhr) {
                    if (xhr.status === 401) {
                        window.location.replace('./login.html');
                    }
                },
                complete: function () {
                    setTimeout(function () {
                        $('.loader_dots').hide();
                    }, time_hide_dots_animation);
                }
            });
        } else {
            setTimeout(function () {
                $('.loader_dots').hide();
            }, time_hide_dots_animation);
        }
    }

    function showError(data) {
        $('#err-messege').text(data.message);
        /*let btn = document.getElementById('btnmodalError');
        if (btn) {
            let event = new Event("click");
            btn.dispatchEvent(event);
        } else {
            console.error('btnmodalError не знайдено в DOM');
        }*/
        const modalElement = document.getElementById('modalError');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        $('body').removeClass('light-theme dark-theme').addClass(savedTheme + '-theme');
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        // const btnThemeToggle = document.getElementById("themeToggle");
        const btnThemeToggle = document.querySelectorAll('.theme-toggle');

        $('.theme-toggle img').hide();
        $('.theme-toggle .theme-icon-' + theme).show();

        btnThemeToggle.forEach(btn => {
            const tooltip = new bootstrap.Tooltip(btn);
            btn.setAttribute("data-bs-title", titleBtnTheme[theme]);
            tooltip.setContent({ '.tooltip-inner': btn.getAttribute("data-bs-title") });
            clearTooltip();
        });
    }

    function bindEvents() {
        $('#toggleSidebarBtn').on('click', function () {
            const $sidebar = $('.people-sidebar');
            const $icon = $(this).find('img');

            $sidebar.toggleClass('collapsed');

            if ($sidebar.hasClass('collapsed')) {
                $icon.attr('src', './img/next.png');
                $icon.attr('alt', 'Розгорнути');
            } else {
                $icon.attr('src', './img/previous.png');
                $icon.attr('alt', 'Згорнути');
            }
        });

        $('.search').on('submit', function (event) {
            event.preventDefault();

            let search_type = $(this).data('search-type');
            let search_value = $(this).find('.search-input').val().trim();
            // console.log({ search_value, search_type });

            switch (search_type) {
                case "task":
                    currentSearchTask = search_value;
                    renderTasks();
                    break;
                case "people":
                    currentSearchPeople = search_value;
                    renderPeople();
                    break;
                case "people-modal":
                    currentSearchPeopleModal = search_value;
                    renderPeopleTable();
                    break;
            }
        });

        $('#settingsPeople').click(function () {
            $('.loader_dots').show();
            renderPeopleTable();
            $('#peopleModal').addClass('show');
        });

        $('#settingsGlobal').click(function () {
            $('#settingsModal').addClass('show');
        });

        $('#settingsTasks').click(function () {
            $('.calendar-content').hide();
            $('.people-sidebar').show();
            $('.task-content').show(); 
        });

        $('#settingsCalendar').click(function () {
            $('.people-sidebar').hide();
            $('.task-content').hide();
            $('.calendar-content').show();
        });

        $('.header-content h1').click(function (e) {
            e.preventDefault();
            location.reload(true);
        });

        // Theme toggle
        $('.theme-toggle').click(function () {
            const currentTheme = $('body').hasClass('light-theme') ? 'light' : 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            $('body').removeClass('light-theme dark-theme').addClass(newTheme + '-theme');
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });

        // Create task button
        $('#createTaskBtn').click(function () {
            const form = document.querySelector('#taskModal form');

            form.reset();
            clearTooltip();
            populateFormSelects();
            if (selectedPersonId) $('#assignedTo').val(selectedPersonId);
            $('#taskModal .modal-header').find('h3').text('Створити задачу');
            $('#taskModal').addClass('show');
            $(".flatpickr").flatpickr(flatpickr_config);
            $('#taskId').val(0);
        });

        // Modal close buttons
        $('.modal-close, .modal-cancel').click(function () {
            // $('.modal').removeClass('show');
            let modal_id = $(this).data('modal-id');
            $('#' + modal_id).removeClass('show');
        });

        // Click outside modal to close
        $('.modal').click(function (e) {
            if (e.target === this) {
                // $(this).removeClass('show');
            }
        });

        $('.status-chip').click(function () {
            $('.status-chip').removeClass('active');
            $(this).addClass('active');
            if ($(this).data('state') != undefined) {
                currentStatusFilter = $(this).data('state');
                renderTasks();
            }
        });

        // Form submissions
        $('#taskForm').submit(function (e) {
            e.preventDefault();
            submitTask();
        });

        $('#saveTaskButton').on('click', function (e) {
            e.preventDefault();
            submitTask();
        });

        // Edit task
        $('.status-select').change(function () {
            const taskId = $(this).data('task-id');
            const newStatus = $(this).val();
            updateTaskStatus(taskId, newStatus);
        });

        $('.priority-select').change(function () {
            const taskId = $(this).data('task-id');
            const newPriority = $(this).val();
            updateTaskPriority(taskId, newPriority);
        });

        $('.edit-task').click(function () {
            const taskId = $(this).data('task-id');
            openEditTaskModal(taskId);
        });

        // History task
        $('.view-history').click(function () {
            const taskId = $(this).data('task-id');
            openHistoryModal(taskId);
        });

        $(document).on('keydown', function (event) {
            // Check if the pressed key is the Escape key
            if (event.key === "Escape" || event.keyCode === 27) {
                event.preventDefault();
                $('.modal').removeClass('show');
            }
        });

        $('.task-item').on('dblclick', function () {
            const taskId = $(this).data('task-id');
            openEditTaskModal(taskId);
        });

        $('#savePersonButton').on('click', function (e) {
            e.preventDefault();
            submitPerson();
        });

        // Create person button
        $('#createPersonBtn').click(function () {
            const form = document.querySelector('#personForm');

            form.reset();
            clearTooltip();
            $('#personModal .modal-header').find('h3').text('Додати співробітника');
            $('#personModal').addClass('show');
            $('#personId').val(0);
        });

        $(document).on('click', '#tasksPagination .page-link', function (e) {
            e.preventDefault();

            const item = $(this).closest('.page-item');

            if (item.hasClass('disabled')) {
                return;
            }

            let page = $(this).data('page');

            if (page === 'next') {
                page = paginationState.page + 1;
            } else if (page === 'prev') {
                page = paginationState.page - 1;
            }

            getFilteredTasks(page);
        });

        document.getElementById('peopleModal')
            ?.addEventListener('shown.bs.modal', setPeopleModalLayout);

        window.addEventListener('resize', setPeopleModalLayout);
    }

    function renderPeopleTable() {
        const persons = $('#peopleModal .table-persons tbody');
        persons.empty();

        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?getPeople=true&all=1', { search: currentSearchPeopleModal }, function (data) {
                if (data.success) {
                    setPeopleTable(persons, data.result);
                } else {
                    showError(data);
                }

                setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
            });
        } else {
            setPeopleTable(persons, dataPeople);
            setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
        }
    }

    function setPeopleTable(persons, data) {
        $.each(data, function (index, value) {
            let class_bg = (value.deleted == 1) ? 'bg-remove-person' : '';
            let success = true;

            if (!SETTINGS.useBackend) {
                const fullName = `${value.surname || ''} ${value.name || ''} ${value.patronymic || ''}`.toLowerCase().trim();
                const searchText = currentSearchPeopleModal.toLowerCase().trim();

                if (searchText && searchText != '' && !fullName.includes(searchText)) {
                    success = false;
                }
            }

            if (success) {
                const personElement = $(`
                    <tr>
                        <th scope="row">${index + 1}</th>
                        <td class="icon ${class_bg}">
                            <div class="person-icon">
                                <img src="./img/${value.icon}" alt="👤">
                            </div>
                        </td>
                        <td class="surname ${class_bg}">${value.surname}</td>
                        <td class="name ${class_bg}">${value.name}</td>
                        <td class="patronymic ${class_bg}">${value.patronymic}</td>
                        <td class="position ${class_bg}">${value.position}</td>
                        <td class="sex ${class_bg}" style="display:none;">${value.sex}</td>
                        <td class="deleted ${class_bg}" style="display:none;">${value.deleted}</td>
                        <td class="phone ${class_bg}">${value.phone}</td>
                        <td class="email ${class_bg}">${value.email}</td>
                        <td class="state ${class_bg}">${value.state}</td>
                        <td class="${class_bg}">
                            <button class="btn btn-secondary edit-person" data-person-id="${value.id}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Редагувати" onfocusout="clearTooltip()">
                                <img class="invert-icon" src="./img/pencil-square.svg" alt="Редагувати" />
                            </button>
                        </td>
                    </tr>
                `).each(function () {
                    $(this).find('.edit-person').click(function () {
                        const personId = $(this).data('person-id');
                        const row = $(this).closest('tr');
                        const person = {
                            id: personId,
                            icon: row.find('.person-icon img').attr('src'),
                            surname: row.find('.surname').text().trim(),
                            name: row.find('.name').text().trim(),
                            patronymic: row.find('.patronymic').text().trim(),
                            position: row.find('.position').text().trim(),
                            sex: row.find('.sex').text().trim(),
                            deleted: row.find('.deleted').text().trim(),
                            phone: row.find('.phone').text().trim(),
                            email: row.find('.email').text().trim(),
                        };

                        // console.log({ person });
                        openEditPersonModal(person);
                    });
                });

                persons.append(personElement);
            }
        });

        window.updatePeopleTableLayout = setPeopleModalLayout;
    }

    function setPeopleModalLayout() {
        const modal = document.getElementById('peopleModal');
        if (!modal) return;

        const header = modal.querySelector('.modal-body-header');
        const thead = modal.querySelector('.table-persons thead');
        const wrap = modal.querySelector('.modal-body-table');
        if (!wrap) return;

        const headerH = header ? header.getBoundingClientRect().height : 0;
        const theadH = thead ? thead.getBoundingClientRect().height : 0;

        // прокинемо змінні у CSS
        wrap.style.setProperty('--headerH', `${headerH}px`);
        wrap.style.setProperty('--theadH', `${theadH}px`);
    }

    function renderPeople() {
        const peopleList = $('#peopleList');
        peopleList.empty();
        peopleCount = 0;

        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?getPeople=true', { search: currentSearchPeople }, function (data) {
                // console.log({ data });
                if (data.success) {
                    mockPeople = data.result;
                    populateFormSelects();
                    createPersonItems(peopleList, mockPeople);
                } else {
                    showError(data);
                    setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
                }
            });
        } else {
            mockPeople = dataPeople;
            // console.log({ mockPeople });
            populateFormSelects();
            createPersonItems(peopleList, mockPeople);
        }
    }

    function createPersonItems(peopleList, data) {
        $.each(data, function (index, value) {
            if (value.deleted == 1) {
                return true;
            }

            if (!SETTINGS.useBackend) {
                const fullName = `${value.surname || ''} ${value.name || ''} ${value.patronymic || ''}`.toLowerCase().trim();
                const searchText = currentSearchPeople.toLowerCase().trim();

                if (searchText && searchText != '' && !fullName.includes(searchText)) {
                    return true;
                }
            }

            peopleCount++;

            const personElement = $(`
                <div class="person-item" data-person-id="${value.id}">
                    <div class="person-icon">
                        <img src="./img/${value.icon}" alt="👤">
                    </div>
                    <div class="person-item-info">
                        <div class="person-name">${value.surname} ${value.name}</div>
                        <div class="person-name-short">${value.fio}</div>
                        <div class="person-position">${value.position}</div>
                        <div class="person-position-short">${value.position_short}</div>
                    </div>
                </div>
            `);

            personElement.click(function () {
                selectPerson(value.id);
            });

            peopleList.append(personElement);
        });

        $('.people-sidebar-count span').text(peopleCount);
    }

    function selectPerson(personId) {
        currentSearchTask = '';
        currentStatusFilter = 1;
        selectedPersonId = personId;
        const selectedPerson = mockPeople.find(p => p.id === personId);
        selectedPersonPosition = selectedPerson.position;

        $('.loader_dots').show();
        $('.person-item').removeClass('active');
        $('.status-chip').removeClass('active');
        $(`.person-item[data-person-id="${personId}"]`).addClass('active');
        $(`.status-chip[data-status="in-line"]`).addClass('active');
        $('#selectedPersonName').text(`Задачі ${selectedPerson.fio}`);
        $('#emptyState').hide();
        $('#taskSection').show();

        renderTasks();
    }

    function renderTasks() {
        if (!selectedPersonId) return;

        getFilteredTasks();
    }

    function getFilteredTasks(page = 1) {
        const selectedPerson = mockPeople.find(p => p.id === selectedPersonId);
        const taskList = $('#taskList');
        const noTasksDiv = $('#noTasks');

        taskList.hide().empty();
        noTasksDiv.show();

        // console.log({ SETTINGS, selectedPersonId, currentSearchTask, currentStatusFilter });

        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?getTasks=true', {
                user_id: selectedPersonId, search: currentSearchTask, filter: currentStatusFilter, position: selectedPerson.position, page, limit: TASKS_PER_PAGE
            }, function (data) {
                // console.log({ data });
                if (data.success) {
                    paginationState.page = page;
                    paginationState.total = data.result.total;
                    paginationState.totalPages = Math.ceil(paginationState.total / TASKS_PER_PAGE);

                    renderTaskStats(data.result.statuses);
                    renderTasksData(data.result.tasks, taskList, noTasksDiv);
                    renderPagination();
                } else {
                    showError(data);
                }
            });
        } else {
            let user_statuses = (tasks[selectedPersonId]) ? tasks[selectedPersonId].statuses : statuses;
            let filteredTasks = (tasks[selectedPersonId]) ? tasks[selectedPersonId].tasks : [];

            renderTaskStats(user_statuses);
            renderTasksData(filteredTasks, taskList, noTasksDiv);
        }
    }

    function renderTasksData(filteredTasks, taskList, noTasksDiv) {
        if (filteredTasks.length > 0) {
            noTasksDiv.hide();
            taskList.show();
            let isset_tasks = false;
            let task_data = [];

            filteredTasks.forEach(task => {
                const taskElement = createTaskElement(task);

                if (SETTINGS.useBackend) {
                    isset_tasks = true;
                    taskList.append(taskElement);
                    task_data.push(task);
                } else {
                    if ((currentStatusFilter == task.status_id) || (currentStatusFilter == 0 && [1, 2, 3].includes(task.status_id))) {
                        isset_tasks = true;
                        taskList.append(taskElement);
                        task_data.push(task);
                    }
                }
            });

            if (!isset_tasks) {
                noTasksDiv.show();
                taskList.hide();
            } else {
                // initTasksPagination(task_data);
            }

            $('[data-bs-toggle="tooltip"]').tooltip();
        }

        setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
    }

    function createTaskElement(task) {
        // console.log({ task });
        let br_color = '#3182ce';
        let priority = priorities[task.priority];
        let type = types[task.type];
        let assignedTo_html = (selectedPersonPosition == 'Developer') ? '' : `<div class="task-meta-item"><span class="task-meta-item-name">Виконавець:</span><span class="meta">${task.assignedToName}</span></div>`;
        let responsiblePM_html = (selectedPersonPosition != 'Developer') ? '' : `<div class="task-meta-item"><span class="task-meta-item-name">Відповідальний:</span><span class="meta">${task.responsiblePMName}</span></div>`;
        let planned_execution_date = (task.planned_execution_date == '') ? '' : `<div class="task-meta-item"><span class="task-meta-item-name">Планова дата виконання:</span><span class="meta">${task.planned_execution_date}</span></div>`;
        let task_description_html = (task.description != '') ? '<div class="task-description"><span class="task-meta-item-name">Опис:</span>' + task.description + '</div>' : '';
        let task_source_html = (task.source != '') ? '<div class="task-source"><span class="task-meta-item-name">Посилання на таск:</span><a href="' + task.source + '" target="_blank">' + task.short_source + '</a></div>' : '';

        var statuse_options = '';
        const sortedStatuses = [...statusesData].sort(
            (a, b) => a.position - b.position
        );

        sortedStatuses.forEach(statuse => {
            if (task.status_id === statuse.id) {
                br_color = statuse.color;
            }

            if (statuse.select_item) {
                statuse_options += `<option value="${statuse.id}" ${task.status_id === Number(statuse.id) ? 'selected' : ''}>${statuse.title}</option>`;
            }
        });

        var priority_options = Object.entries(priorities)
            .map(([value, title]) => {
                return `<option value="${value}" ${task.priority === Number(value) ? 'selected' : ''}>${title}</option>`;
            }).join('');

        return $(`
        <div class="task-item" style="border-left: 4px solid ${br_color};" data-task-id="${task.id}">
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-project"><span class="task-meta-item-name">Проект:</span>${task.project}</div>
                ${task_source_html}
                ${task_description_html}
                <div class="task-meta">
                    <div class="task-meta-item"><span class="task-meta-item-name">№:</span><span class="meta">${task.id}</span></div>
                    <div class="task-meta-item"><span class="task-meta-item-name">Тип:</span><span class="meta">${type}</span></div>
                    <div class="task-meta-item"><span class="task-meta-item-name">Створено:</span><span class="meta">${task.createdAt}</span></div>
                    <div class="task-meta-item"><span class="task-meta-item-name">Змінено:</span><span class="meta">${task.updatedAt}</span></div>
                    ${responsiblePM_html}
                    ${assignedTo_html}
                </div>
            </div>
            <div class="task-actions">
                <div class="task-actions-select">
                    <select name="status-select" class="form-select status-select" data-task-id="${task.id}">
                        ${statuse_options}
                    </select>
                    <select name="priority-select" class="form-select priority-select" data-task-id="${task.id}">
                        ${priority_options}
                    </select>
                </div>
            </div>
            <div class="task-menu">
                <div class="dropdown">
                    <button class="dropdown-toggle" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                            <img class="invert-icon" src="./img/three-dots-vertical.svg" alt="Меню" />
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <a class="dropdown-item edit-task" data-task-id="${task.id}">
                                <img class="invert-icon" src="./img/pencil-square.svg" alt="Редагувати">
                                Редагувати дані по задачі
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item view-history" data-task-id="${task.id}">
                                <img class="invert-icon" src="./img/clock-history.svg" alt="Історія">
                                Переглянути історію змін по задачі
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        `).each(function () {
            $(this).on('dblclick', function () {
                const taskId = $(this).data('task-id');
                openEditTaskModal(taskId);
            });

            $(this).find('.status-select').change(function () {
                const taskId = $(this).data('task-id');
                const newStatus = $(this).val();
                updateTaskStatus(taskId, newStatus);
            });

            $(this).find('.priority-select').change(function () {
                const taskId = $(this).data('task-id');
                const newPriority = $(this).val();
                updateTaskPriority(taskId, newPriority);
            });

            $(this).find('.edit-task').click(function () {
                const taskId = $(this).data('task-id');
                openEditTaskModal(taskId);
            });

            $(this).find('.view-history').click(function () {
                const taskId = $(this).data('task-id');
                openHistoryModal(taskId);
            });
        });
    }

    function renderPagination() {
        const wrapper = $('#tasksPaginationWrapper');
        const pagination = $('#tasksPagination');
        const current = paginationState.page;
        const total = paginationState.totalPages;

        let start = Math.max(current - 1, 1);
        let end = Math.min(start + 2, total);

        pagination.empty();

        if (total <= 1) {
            $('.task-list-container').css('height', 'calc(100vh - 250px)');
            wrapper.hide();
            return;
        }

        $('.task-list-container').css('height', 'calc(100vh - 300px)');
        wrapper.show();

        // previous
        pagination.append(`
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="prev">&laquo;</a>
            </li>
        `);

        if (end - start < 2) {
            start = Math.max(end - 2, 1);
        }

        for (let i = start; i <= end; i++) {
            pagination.append(`
                <li class="page-item ${i === current ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        pagination.append(`
            <li class="page-item ${current === total ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="next">&raquo;</a>
            </li>
        `);
    }

    function renderTaskStats(statuses) {
        const status = $('#statusSummary');

        status.find('[data-status="all"] .status-count').text(statuses.all);
        status.find('[data-status="active"] .status-count').text(statuses.active);
        status.find('[data-status="in-line"] .status-count').text(statuses.line);
        status.find('[data-status="work"] .status-count').text(statuses.work);
        status.find('[data-status="review"] .status-count').text(statuses.review);
        status.find('[data-status="review-client"] .status-count').text(statuses.review_client);
        status.find('[data-status="ready"] .status-count').text(statuses.ready);
        status.find('[data-status="rejected"] .status-count').text(statuses.rejected);
        status.find('[data-status="suspended"] .status-count').text(statuses.suspended);
    }

    function populateFormSelects() {
        const selects = ['#responsiblePM', '#assignedTo'];

        selects.forEach(selector => {
            const select = $(selector);
            select.empty();

            switch (selector) {
                case "#responsiblePM":
                    select.append(`<option value="" disabled selected>-- Оберіть відповідального --</option>`);
                    break;
                case "#assignedTo":
                    select.append(`<option value="" disabled selected>-- Оберіть виконавця --</option>`);
                    break;
            }

            mockPeople.forEach(person => {
                switch (selector) {
                    case "#responsiblePM":
                        if (person.position == 'Project manager' || person.position == 'Tester') {
                            select.append(`<option value="${person.id}">${person.surname} ${person.name}</option>`);
                        }
                        break;
                    case "#assignedTo":
                        if (person.position == 'Developer' || person.position == 'System administrator') {
                            select.append(`<option value="${person.id}">${person.surname} ${person.name}</option>`);
                        }
                        break;
                }
            });
        });
    }

    function submitTask() {
        const formData = new FormData(document.getElementById('taskForm'));

        var taskId = parseInt($('#taskId').val());

        $('.loader_dots').show();
        $('#saveTaskButton').prop('disabled', true);
        console.log({ taskId });

        const notification = (SETTINGS.useBackend) ? ((taskId) ? 'Задачу оновлено успішно' : 'Задачу створено успішно') : ((taskId) ? 'Задачу не оновлено' : 'Задачу не створено успішно');

        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?submitTask=true', formData, function (data) {
                $('#saveTaskButton').prop('disabled', false);
                setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);

                if (data.success) {
                    showNotification(notification);
                    $('#taskModal').removeClass('show');
                    $('#taskForm')[0].reset();
                    renderTasks();
                } else {
                    showError(data);
                }
            });
        } else {
            $('#saveTaskButton').prop('disabled', false);
            setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
            showNotification(notification);
            $('#taskModal').removeClass('show');
            $('#taskForm')[0].reset();
            renderTasks();
        }
    }

    function updateTaskStatus(taskId, newStatus) {
        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?setTaskStatus=true', { taskId, newStatus }, function (data) {
                if (data.success) {
                    renderTasks();
                    showNotification(`Статус задачі змінено`);
                } else { showError(data); }
            });
        } else {
            showNotification(`Статус задачі змінити неможливо в офлайн режимі`);
        }
    }

    function updateTaskPriority(taskId, newPriority) {
        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?setTaskPriority=true', { taskId, newPriority }, function (data) {
                if (data.success) {
                    renderTasks();
                    showNotification(`Пріоритет задачі змінено`);
                } else { showError(data); }
            });
        } else {
            showNotification(`Пріоритет задачі змінити неможливо в офлайн режимі`);
        }
    }

    function openEditTaskModal(taskId) {
        clearTooltip();

        if (SETTINGS.useBackend) {
            $('.loader_dots').show();

            apiPost('app/ajax.php?getTask=true', { taskId }, function (data) {
                if (data.success) {
                    var task = data.result;
                    // console.log({ task });

                    $('#taskModal .modal-header').find('h3').text('Редагувати задачу №' + task.id);
                    $('#taskId').val(task.id);
                    $('#taskTitle').val(task.title);
                    $('#projectName').val(task.project);
                    $('#taskSource').val(task.source);
                    $('#taskDescription').val(task.description);
                    $('#taskStatus').val(task.status_id);
                    $('#taskPriority').val(task.priority);
                    $('#taskType').val(task.type);
                    $('#responsiblePM').val(task.responsiblePM);
                    $('#assignedTo').val(task.assignedTo);
                    $('#taskEstimateHour').val(task.estimate.hours);
                    $('#taskEstimateMinute').val(task.estimate.minutes);

                    $('#taskModal').addClass('show');
                    $(".flatpickr").flatpickr(flatpickr_config);
                    $('#taskPlannedExecutionDate').val(task.planned_execution_date);
                } else { showError(data); }

                setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
            });
        } else {
            showNotification(`Редагувати задачу неможливо в офлайн режимі`);
        }
    }

    function openHistoryModal(taskId) {
        clearTooltip();
        if (!taskId) return;
        // const endDate = new Date().toISOString().split('T')[0];
        // const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // $('#startDate').val(startDate);
        // $('#endDate').val(endDate);

        if (SETTINGS.useBackend) {
            $('.loader_dots').show();

            apiPost('app/ajax.php?getTaskHistory=true', { taskId }, function (data) {
                if (data.success) {
                    var data = data.result;

                    $('#historyModal .modal-header h3').text(`Історія змін по задачі №${taskId}`);
                    $('#historyModal').addClass('show');
                    renderHistory(data);
                } else { showError(data); }
            });
        } else {
            showNotification(`Перегляд історії змін по задачі неможливо в офлайн режимі`);
        }
    }

    function renderHistory(taskHistoryData) {
        const historyList = $('#historyList');
        historyList.empty();

        if (taskHistoryData.length === 0) {
            historyList.append('<div class="history-item">Історії змін по задачі не знайдено</div>');
            return;
        }

        taskHistoryData.forEach(item => {
            let action = actions[item.action];
            let priority = priorities[item.priority];

            const historyElement = $(`
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-action"><span>Дія:</span>${action}</div>
                        <div class="history-timestamp"><span>Дата та час зміни:</span>${item.datetime}</div>
                    </div>
                    <div class="history-data"><span>Назва:</span>${item.title}</div>
                    <div class="history-data"><span>Назва проекту:</span>${item.project}</div>
                    <div class="history-data"><span>Відповідальний:</span>${item.responsiblePMName}</div>
                    <div class="history-data"><span>Виконавець:</span>${item.assignedToName}</div>
                    <div class="history-data"><span>Статус:</span>${item.status_name}</div>
                    <div class="history-data"><span>Пріоритет:</span>${priority}</div>
                    <div class="history-data"><span>Посилання на таск:</span>${item.source}</div>
                    <div class="history-data"><span>Опис:</span>${item.description}</div>
                </div>
            `);

            historyList.append(historyElement);
        });

        setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
    }

    function showNotification(message) {
        const notification = $(`<div class="notification">${message}</div>`);
        $('body').append(notification);

        setTimeout(() => {
            notification.fadeOut(300, function () {
                $(this).remove();
            });
        }, 3000);
    }

    function clearTooltip() {
        $('.tooltip').removeClass('show');
        $('.tooltip').hide();
    }

    function openEditPersonModal(person) {
        $('.loader_dots').show();
        clearTooltip();

        var header_text = (person.sex == 1) ? 'Співробітник' : 'Співробітниця';
        $('#personModal .modal-header').find('h3').text(header_text);
        $('#personForm #personId').val(person.id);
        $('#personForm #personSurname').val(person.surname);
        $('#personForm #personName').val(person.name);
        $('#personForm #personPatronymic').val(person.patronymic);
        $('#personForm #personPosition').val(person.position);
        $('#personForm #personSex').val(person.sex);
        $('#personForm #personState').val(person.deleted);
        $('#personForm #personPhone').val(person.phone);
        $('#personForm #personEmail').val(person.email);

        $('#personModal').addClass('show');
        setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
    }

    function submitPerson() {
        const formData = new FormData(document.getElementById('personForm'));

        var personId = parseInt($('#personId').val());

        $('.loader_dots').show();
        $('#savePersonButton').prop('disabled', true);

        const notification = (SETTINGS.useBackend) ? ((personId) ? 'Дані оновлено успішно' : 'Створено успішно') : 'Дані не змінено';

        if (SETTINGS.useBackend) {
            apiPost('app/ajax.php?submitPerson=true', formData, function (data) {
                $('#savePersonButton').prop('disabled', false);
                setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);

                if (data.success) {
                    showNotification(notification);
                    $('#personModal').removeClass('show');
                    $('#personForm')[0].reset();
                    renderTasks();
                } else {
                    showError(data);
                }

                renderPeopleTable();
                renderPeople();
            });
        } else {
            $('#savePersonButton').prop('disabled', false);
            setTimeout(function () { $('.loader_dots').hide(); }, time_hide_dots_animation);
            showNotification(notification);
            $('#personModal').removeClass('show');
            $('#personForm')[0].reset();
        }
    }

    function setSettings() {
        (async () => {
            document.getElementById('current-year').textContent = '2025-' + new Date().getFullYear();

            if (typeof window.APP_CONFIG.client !== 'undefined' && window.APP_CONFIG.client !== '') {
                $('.client-name').text(window.APP_CONFIG.client);
            }

            if (typeof window.APP_CONFIG.clientLogo !== 'undefined' && window.APP_CONFIG.clientLogo !== '') {
                const logo = './img/client_logo/' + window.APP_CONFIG.clientLogo;
                $('.logo_img').attr('src', logo);
                $('.logo_img').show();
            }

            SETTINGS.useBackend = await getBackendMode();

            if (SETTINGS.useBackend) {
                $('.header .wifi-status').hide();
                $('.img-wifi-on').show();
                $('.img-wifi-off').hide();
            } else {
                $('.img-wifi-on').hide();
                $('.img-wifi-off').show();
            }

            initializeTheme();
            renderPeople();
            bindEvents();
            setTimeout(function () {
                $('.loader_dots').hide();
                $('[data-bs-toggle="tooltip"]').tooltip();
            }, 100);
        })();
    }

    async function getBackendMode() {
        if (typeof window.APP_CONFIG.useBackend !== 'undefined') {
            return window.APP_CONFIG.useBackend;
        }

        return await detectBackend();
    }

    async function detectBackend() {
        try {
            const response = await fetch(
                'app/ajax.php?ping=1'
            );

            const data = await response.json();

            return data.status === 'ok';
        } catch (e) {
            return false;
        }
    }

    // Add keyframe animation for notifications
    $('<style>').prop('type', 'text/css').html(`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `).appendTo('head');

} catch (e) {
    console.log('+++ Exeption +++', e);
}