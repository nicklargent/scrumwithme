module.exports = (grunt) ->

    # config
    grunt.initConfig

        pkg: grunt.file.readJSON("package.json")

        appVersion: grunt.template.today('yyyymmddHHMM')

        files:
            js:
                vendor: [
                    "public/vendor/angular/angular.min.js"
                    "public/vendor/angular/angular-cookies.min.js"
                ]
                src: ["public/src/js/**/*.js"]

            css:
                src: ["public/src/css/**/*.css"]

            html:
                src: ["*.html"]


        # tasks

        clean:
            workspaces: ['public/dist', 'build', 'scrumwithme.*.zip']

        open:
            dev:
                path: "http://localhost:4000"

        jshint:
            src: "<%=files.js.src%>"

        concat:
            app_js:
                dest: 'public/dist/js/app.min.js'
                src: ["<%=files.js.src%>"]
            vendor_js:
                dest: 'public/dist/js/vendor.min.js'
                src: ["<%=files.js.vendor%>"]

            app_css:
                dest: 'public/dist/css/app.css'
                src: ["<%=files.css.src%>"]

        uglify:
            #options:
                #banner: "hi"

            dist:
                src: "<%=concat.app_js.dest %>"
                dest: "<%=concat.app_js.dest %>"


        copy:
            build:
                src: ["app/**", "public/**", ".ebextensions/**", "package.json", "!public/src/**", "!public/vendor/**"]
                dest: "build"
                expand: true

        replace:
            all:
                src: ['public/dist/js/app.min.js']
                overwrite: true
                replacements: [
                    from: "{{APP.VERSION}}"
                    to: "<%=appVersion%>"
                ]

        compress:
            build:
                options:
                    archive: "<%=pkg.name%>.<%=appVersion%>.zip"
                    mode: "zip"
                cwd: "build"
                src: ["**"]

        watch:
            options:
                livereload: true

            js:
                files: "<%=files.js.src%>"
                tasks: ["concat:app_js", 'replace']

            css:
                files: "<%=files.css.src%>"
                tasks: ["concat:app_css", 'replace']

            html:
                files: "<%=files.html.src%>"

        nodemon:
            dev:
                script: 'app/app.js'
                options:
                    watch: ['app']

        concurrent:
            options:
                logConcurrentOutput: true
            tasks: ['nodemon', 'watch']


    # load plugins
    require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

    # create workflow
    grunt.registerTask 'default', ['concat', 'replace', 'open', 'concurrent']
    grunt.registerTask 'build', ['clean', 'jshint', 'concat', 'uglify', 'replace', 'copy:build', 'compress:build']



