ID=$(xinput --list | grep M720.*Keyboard | sed -E 's/.*id=([0-9]+).*/\1/g');
OUT=$(xinput disable $ID 2>&1);
LOG="/home/liliana/fixmouse.log";

if [ -n "${LOG}" ]; then
    echo $(date) >> $LOG;
    echo "id: $ID" >> $LOG;
    echo $OUT >> $LOG;
    echo "" >> fixmouse.log;
fi


# xinput disable $(xinput --list | grep M720.*keyboard | sed -E 's/.*id=([0-9]+).*/\1/g')