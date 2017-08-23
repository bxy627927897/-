;(function () {
    'use strict';
    // 严格模式定义
    
    var $form_add_task = $('.add-task')
        , $window = $(window)

        , $body = $('body')
        , task_list = []
        , $task_delete_trigger
        , $task_detail_trigger
        , $task_detail = $('.task-detail')
        , $task_detail_mask = $('.task-detail-mask')
        , currect_index
        , $update_form
        , $task_detail_content
        , $task_detail_content_input
        , $checkbox_complete
        , $msg = $('.msg')
        , $msg_content = $msg.find('.msg-content')
        , $msg_confirm = $msg.find('.confirmed')
        , $alerter = $('.alerter')
        ;

    //clearlocalstore();
    init();
    
    $form_add_task.on('submit', on_add_task_form_submit);
    $task_detail_mask.on('click', hide_task_detail);

    function pop(arg) {
        if(!arg) {
            console.error('pop title is required');
        }
        var conf = {}, $box, $mask, $title, $content, $confirm, $cancel,
        dfd, timer, confirmed ;

        dfd = $.Deferred();

        if (typeof arg =='string') {
            conf.title = arg;
        } else {
            conf = $.extend(conf, arg);
        }

        $box = $('<div>' + 
            '<div class="pop-title">'+ conf.title +'</div>' +
            '<div class="pop-content">' +
            '<div><button style="margin-right: 5px;" class="primary confirm">确定</button>' + 
            '<button class="cancel">取消</button></div>' +
            '</div>' +
            '</div>').css({
            color: '#444',
            width: 300,
            height: 'auto',
            padding:'15px 10px',
            background: '#fff',
            position:'fixed',
            'border-radius': 3,
            'box-shadow': '0 1px 2px rgba(0,0,0,0.5)'
        })

        $title = $box.find('.pop-title').css({
            padding:'5px 10px',
            'font-weight': 900,
            'font-size': 20,
            'text-align': 'center',
        })

        $content = $box.find('.pop-content').css({
            padding:'5px 10px',
            'text-align': 'center',
        })

        $confirm = $content.find('button.confirm');
        $cancel = $content.find('button.cancel');

        $mask = $('<div></div>').css({
            position:'fixed',
            top:0,
            bottom:0,
            left:0,
            right:0,
            background:'rgba(0,0,0,0.5)',
        })

        timer = setInterval(function() {
            if (confirmed !== undefined) {
                dfd.resolve(confirmed);
                clearInterval(timer);
                dismiss_pop();
            }
        }, 50);

        $confirm.on('click', function () {
            confirmed = 1;
        })

        $cancel.on('click', function () {
            confirmed = 0;
        })

        $mask.on('click', function() {
            confirmed = 0;
        })

        function dismiss_pop() {
            $mask.remove();
            $box.remove();
        }

        function adjust_box_position() {
            var window_width = $window.width();
            var window_height = $window.height();
            var box_width = $box.width();
            var box_height = $box.height();
            var move_x, move_y;

            move_x = (window_width - box_width) / 2;
            move_y = ((window_height - box_height) / 2) - 30;

            $box.css({
                left:move_x,
                top:move_y,
            })
        }

        $window.on('resize', function () {
            adjust_box_position();
        })

        $mask.appendTo($body);
        $box.appendTo($body);
        $window.resize();
        return dfd.promise();
    }

    

    


    function listen_msg_event() {
        $msg_confirm.on('click', function () {
            hide_msg();
        })
    }

    function on_add_task_form_submit(e) {
        var new_task = {};
        var $input;
        e.preventDefault();                         //禁用默认行为
        $input = $(this).find('input[name=content]');
        new_task.content = $input.val();  //获取新task值
        if (!new_task.content) return;  //如果新task值为空，则直接返回
        //console.log('new_task',new_task);
        if (add_task(new_task)) {
            render_task_list();
            $input.val(null);
        }
        //存入新task
    }

    function listen_task_delete() {
        $task_delete_trigger.on('click', function () {
        var $this = $(this);       //找到删除按钮所在的task
        var $item = $this.parent().parent();
        var index = $item.data('index');
        pop('确定要删除吗？').then(function (r) {
            //console.log(r);
            r ? delete_task(index) : null; 
        })  //确认 
    })
    }

    /*给详情添加点击事件*/
    function listen_task_detail() {
        var index;
        $('.task-item').on('dblclick', function() {  //双击显示
            index = $(this).data('index');
            show_task_detail(index);
        })
        $task_detail_trigger.on('click', function() {  //点击详情显示
            var $this = $(this);
            var $item = $this.parent().parent();
            var index = $item.data('index');
            // console.log(index);
            show_task_detail(index);
        })
    }

    /*监听task完成事件*/
    function listen_checkbox_complete() {
        $checkbox_complete.on('click', function() {
            //console.log($(this).is(':checked'));
            var is_complete = $(this).is(':checked');
            var index = $(this).parent().parent().data('index');
            var item = get(index);
            if (item.complete) {
                update_task(index, {complete:false});
            } else {
                update_task(index, {complete:true});
            }
            console.log(index);
        })
    }

    function get(index) {
        return store.get('task_list')[index];
    }

    /*显示Task详情页面*/
    function show_task_detail(index) {  
        render_task_detail(index); //生成详情模板
        currect_index = index;
        $task_detail.show();
        $task_detail_mask.show();  //显示detail和detail—mask
    }

    /*隐藏task*/
    function hide_task_detail() {
        $task_detail.hide();
        $task_detail_mask.hide();
    }

    /*详情更改后 更新单个task内容*/
    function update_task(index, data) {
        if (index == null || !task_list[index]) return;

        task_list[index] = $.extend({}, task_list[index], data);  //添加complete属性    
        refresh_task_list();
        //console.log(task_list[index]);
    }

    /*渲染指定task的详情信息*/
    function render_task_detail(index) {
        if(index === undefined || !task_list[index]) return;
        var item = task_list[index];
        //console.log(item);
        var tpl = '<form>' +
                    '<div class="content">'
                    + item.content +
                    '</div>' +
                    '<div class="input-item">' +
                    '<input style="display:none" type="text" name="content" value="' +
                    item.content + '"></div>' +
                    '<div>' +
                    '<div class="desc input-item">' +
                    '<textarea name="desc">' + (item.desc || '') + '</textarea>' +
                    '</div>' +
                    '</div>' +
                    '<div class="remind input-item">' +
                    '<label for="remind_date">提醒时间</label>' +
                    '<input class="datetime" name="remind_date" type="text" id="remind_date" value="' + (item.remind_date || '')  +'">' +
                    '</div>' +
                    '<div class="input-item"><button type="submit">更新</button></div>' +
                    '</form>';

        /*清空task详情模板*/
        $task_detail.html(null);
        $task_detail.html(tpl); //用新模板替换
        $('.datetime').datetimepicker();
        $update_form = $task_detail.find('form');  //选中form，之后使用其监听submit点击时点
        $task_detail_content = $update_form.find('.content');  //选中显示task标题元素
        $task_detail_content_input = $update_form.find('[name=content]'); // 选中input标题元素

        $task_detail_content.on('dblclick', function () {  //双击标题 变成input
            $task_detail_content_input.show();
            $task_detail_content.hide();
        })


        $update_form.on('submit', function (e) {
            e.preventDefault();
            var data = {};
            data.content = $(this).find('[name = content]').val();
            data.desc = $(this).find('[name = desc]').val();
            data.remind_date = $(this).find('[name = remind_date]').val();  //获取详情中的三个值

            update_task(index, data);  //更新localstorage的值
            hide_task_detail();
        })
    }
    
    function add_task(new_task) {
        task_list.push(new_task);     //将新task推入task_list
    
        refresh_task_list();
        return true;
    }

    function delete_task(index) {    //删除一条task
        if(index === undefined || ! task_list[index]) return;
        delete task_list[index];
        refresh_task_list();
    }

    function refresh_task_list() {  //刷新localstorage数据并渲染模板         
        store.set('task_list', task_list);  //更新
        render_task_list();
    }

    function clearlocalstore() {
        store.clear();
    }

    function init() {
        task_list = store.get('task_list') || [];
        if (task_list != []) {
            render_task_list();
        } else {

        }
        task_remind_check();
        listen_msg_event();
    }

    function task_remind_check() {
        var current_timestamp;
        var itl = setInterval(function() {
            for (var i = 0; i < task_list.length; i++) {
                var item = get(i), task_timestamp;
                if (!item || !item.remind_date || item.informed) {
                    continue;
                }
                current_timestamp = (new Date()).getTime();
                task_timestamp = (new Date(item.remind_date)).getTime();
                if (current_timestamp - task_timestamp >= 1) {
                    update_task(i, {informed: true});
                    show_msg(item.content);
                    console.log(item.content);
                }
            }
        }, 300);
    }

    function show_msg(msg) {
        if (!msg) {
            return;
        }
        $msg_content.html(msg);
        $alerter.get(0).play();
        $msg.show();
    }

    function hide_msg() {
        $msg.hide();
    }

    function render_task_list() {   //渲染全部task模板
        var $task_list = $('.task-list');
        $task_list.html('');
        var complete_items = [];
        for(var i = 0; i < task_list.length; i++) {
            if (task_list[i] && task_list[i].complete) {
                complete_items[i] = task_list[i];
            } else {
                var $task = render_task_item(task_list[i], i);
                $task_list.prepend($task);
            }
        }

        for (var j = 0; j < complete_items.length; j++) {
            var $task = render_task_item(complete_items[j], j);
            if ($task == null) {
                continue;
            }
            $task.addClass('completed');
            $task_list.append($task);
        }

        $task_delete_trigger = $('.action.delete');
        $task_detail_trigger = $('.action.detail');
        $checkbox_complete = $('.task-list .complete[type=checkbox]');
        listen_task_delete();
        listen_task_detail();
        listen_checkbox_complete();
    }

    function render_task_item(data, index) {  //渲染单个task模板
        if (!data || index == null) return;
        var list_item_tpl = '<div class="task-item" data-index="'+ index + '">' + 
                '<span><input class="complete"  ' + 
                (data.complete ? 'checked' : '') +' type="checkbox"></span>' +
                '<span class="task-content">'+ data.content +'</span>' +
                '<span class="fr">' +
                '<span class="action delete"> 删除</span>' +
                '<span class="action detail"> 详细</span> </span> </div>' ;
        return $(list_item_tpl);
    }
    
})();   //隐函数