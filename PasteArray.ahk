; Define an array of strings
myArray := [""]

; Initialize an index to keep track of the current position in the array
currentIndex := 1

; Define the hotkey (Alt+Q)
!q::
    ; Check if the current index is within the bounds of the array
    if (currentIndex <= myArray.MaxIndex()) {
        ; Send the current string from the array
        Send, % myArray[currentIndex]
        ; Increment the index for the next press
        currentIndex++
    } else {
        ; Reset index if we reach the end of the array
        ; currentIndex := 1
    }
return