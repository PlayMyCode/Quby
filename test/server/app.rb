
#
#       app.rb
#
# @author Joseph Lenton
#
# This is a script that runs an application,
# and when you hit enter, it kills the app,
# and restarts it.
#
# It's a useful way for quickly making
# applications re-runnable on the command line.
#

class App
    @cmd  = ''
    @prog = ''

    @running = false

    def initialize args, stdin=$stdin
        if args.empty?
            raise Exception.new "no commands given"
        else
            cmd = args[0]

            if cmd['\\']
                cmdParts = cmd.split('\\')
            else
                cmdParts = cmd.split('/' )
            end

            @prog = cmdParts[-1]

            if args[0][' ']
                args[0] = "\"#{args[0]}\""
            end

            @cmd    = args.join ' '
            @stdin  = stdin
        end
    end

    def exit
        kill
        exit
    end

    def halt
        kill
        exit
    end

    def quit
        kill
        exit
    end

    def kill
        if @running
            `taskkill /im "#{@prog}" /f >nul 2>&1`
            @running = false
        end
    end

    def fail err
        puts
        puts '-----------------------'
        puts '         FAIL'
        puts

        puts err || 'application failed to start'
        puts
        puts '-----------------------'
        puts
    end

    # Actual Program

    def run
        puts 'application started ...'
        puts " running #{@cmd}"
        puts
        puts ' - type \'quit\' to end'
        puts ' - hit enter to restart'

        while true
            if not @running
                @running = true

                puts
                puts " ... starting #{@prog} ... "
                puts '-----------------------'

                t = Thread.new do
                    begin
                        obj = IO.popen( @cmd ) do |app|
                            app.each { |line| puts line }
                        end
                    rescue
                        self.fail $!
                    end
                end

                sleep 1
            end

            puts
            print '> '

            commands    = @stdin.gets.chomp.split( ' ' )
            instruction = commands[0]

            if instruction.nil?
                kill
            else
                if self.respond_to? instruction
                    self.send instruction
                else
                    puts 'unknown command, ' + commands
                end
            end
        end
    end
end

App.new( ARGV ).run

