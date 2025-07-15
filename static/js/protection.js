
document.addEventListener('DOMContentLoaded', function() {

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('keydown', function(e) {

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }

        if (e.key === 'F12' || e.code === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if ((e.ctrlKey || e.metaKey) && (
            e.key === 's' ||
            e.key === 'S' ||
            e.keyCode === 83
        )) {
            e.preventDefault();
            return false;
        }

        if (
            (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) ||
            (e.metaKey && e.altKey && (e.key === 's' || e.key === 'S' || e.keyCode === 83))
        ) {
            e.preventDefault();
            return false;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.keyCode === 80)) {
            e.preventDefault();
            return false;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                case 'x':
                case 'a':
                    e.preventDefault();
                    return false;
            }
        }

        if ((e.ctrlKey || e.metaKey) && (
            (e.shiftKey && (e.key === 'i' || e.key === 'I' || e.keyCode === 73)) ||
            (e.altKey && (e.key === 'i' || e.key === 'I' || e.keyCode === 73))
        )) {
            e.preventDefault();
            return false;
        }

        if ((e.ctrlKey || e.metaKey) && (
            (e.shiftKey && (e.key === 'c' || e.key === 'C' || e.keyCode === 67)) ||
            (e.altKey && (e.key === 'c' || e.key === 'C' || e.keyCode === 67))
        )) {
            e.preventDefault();
            return false;
        }

        if (e.metaKey && e.altKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
    }, true);

    document.addEventListener('keydown', function(e) {

        if (e.key && e.key.match(/^F(1[0-2]|[1-9])$/)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);
});
