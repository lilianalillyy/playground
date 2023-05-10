## One of the following ID variables should work
#ID=$(xinput --list | grep M720.*Keyboard | sed -E 's/.*id=([0-9]+).*/\1/g');
#ID=$(xinput list --id-only "keyboard:Logitech M720 Triathlon")
ID=$(xinput list --id-only "keyboard:M720 Triathlon Keyboard")
OUT=$(xinput disable $ID 2>&1);
LOG="/home/liliana/fixmouse.log";

if [ -n "${LOG}" ]; then
    echo $(date) >> $LOG;
    echo "id: $ID" >> $LOG;
    echo $OUT >> $LOG;
    echo "" >> fixmouse.log;
fi
