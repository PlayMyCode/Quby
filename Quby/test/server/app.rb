
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

    def initialize( args, stdin=$stdin )
        if args.empty?
            raise Exception.new "no commands given"
        else
            @prog   = args[0]
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
                    obj = IO.popen( @cmd ) do |app|
                        app.each { |line| puts line }
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

