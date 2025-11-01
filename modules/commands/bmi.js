module.exports.config = {
    name: "bmi",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "?", // Đừng quên điền tên bạn vào đây nhé!
    description: "Tính chỉ số BMI của bạn và hiển thị phân loại chi tiết theo chuẩn Châu Á.",
    commandCategory: "Tiện ích",
    usages: "[chiều_cao_cm]|[cân_nặng_kg]", // Giữ nguyên cú pháp sử dụng chính
    cooldowns: 5
};

module.exports.run = async function ({ event, api, args }) {
    const { threadID, messageID } = event;

    // Bảng phân loại BMI chuẩn Châu Á (được sử dụng cả khi tính và khi chỉ gõ bmi)
    const bmiTable = `
---
**Bảng Phân Loại BMI (Chuẩn Châu Á):**
* **< 16**: Gầy cấp độ 3
* **16 - 17**: Gầy cấp độ 2
* **17 - 18.5**: Gầy cấp độ 1
* **18.5 - 25**: Bình thường
* **25 - 30**: Thừa cân
* **30 - 35**: Béo phì độ 1
* **35 - 40**: Béo phì độ 2
* **> 40**: Béo phì độ 3
---
`;

    const fullArgs = args.join(" ");
    const inputs = fullArgs.split("|");

    // Nếu người dùng không nhập đủ 2 đối số (chiều cao | cân nặng)
    if (inputs.length !== 2) {
        return api.sendMessage(
            "Vui lòng nhập đúng cú pháp: **bmi [chiều_cao_cm]|[cân_nặng_kg]**\nVí dụ: bmi 170|65\n\nBạn có thể tham khảo bảng phân loại BMI dưới đây:\n" + bmiTable,
            threadID,
            messageID
        );
    }

    const heightCm = parseFloat(inputs[0].trim());
    const weightKg = parseFloat(inputs[1].trim());

    if (isNaN(heightCm) || isNaN(weightKg) || heightCm <= 0 || weightKg <= 0) {
        return api.sendMessage(
            "Chiều cao và cân nặng phải là số dương. Vui lòng thử lại.\nVí dụ: bmi 170|65",
            threadID,
            messageID
        );
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    let bmiCategory = "";
    let bmiDescription = "";

    // Phân loại và mô tả chi tiết theo bảng BMI Châu Á
    if (bmi < 16) {
        bmiCategory = "Gầy cấp độ 3";
        bmiDescription = "Gầy rất nặng (suy dinh dưỡng nghiêm trọng), có nguy cơ cao về sức khỏe, cần được thăm khám y tế.";
    } else if (bmi >= 16 && bmi < 17) {
        bmiCategory = "Gầy cấp độ 2";
        bmiDescription = "Gầy vừa (suy dinh dưỡng vừa), có nguy cơ về sức khỏe, cần điều chỉnh chế độ ăn uống.";
    } else if (bmi >= 17 && bmi < 18.5) {
        bmiCategory = "Gầy cấp độ 1";
        bmiDescription = "Gầy nhẹ (thiếu cân), cần chú ý bổ sung dinh dưỡng và tập luyện để đạt cân nặng khỏe mạnh.";
    } else if (bmi >= 18.5 && bmi < 25) {
        bmiCategory = "Bình thường";
        bmiDescription = "Cân nặng khỏe mạnh, là mức lý tưởng và ít nguy cơ mắc các bệnh liên quan đến cân nặng.";
    } else if (bmi >= 25 && bmi < 30) {
        bmiCategory = "Thừa cân";
        bmiDescription = "Có nguy cơ về sức khỏe (như tiểu đường, tim mạch), cần điều chỉnh lối sống và chế độ ăn uống.";
    } else if (bmi >= 30 && bmi < 35) {
        bmiCategory = "Béo phì độ 1";
        bmiDescription = "Nguy cơ cao về các bệnh lý như tim mạch, huyết áp cao, tiểu đường. Nên tham khảo ý kiến chuyên gia.";
    } else if (bmi >= 35 && bmi < 40) {
        bmiCategory = "Béo phì độ 2";
        bmiDescription = "Nguy cơ rất cao về các bệnh lý nghiêm trọng. Cần có sự can thiệp y tế và thay đổi lối sống toàn diện.";
    } else { // bmi >= 40
        bmiCategory = "Béo phì độ 3";
        bmiDescription = "Béo phì rất nặng (béo phì nguy hiểm), tình trạng sức khỏe rất đáng báo động, cần can thiệp y tế khẩn cấp.";
    }

    const message = `
---
**Kết Quả BMI Của Bạn:**

* **Chiều cao:** ${heightCm} cm
* **Cân nặng:** ${weightKg} kg
* **Chỉ số BMI:** ${bmi.toFixed(2)}
* **Phân loại:** **${bmiCategory}**
* **Mô tả chi tiết:** ${bmiDescription}
${bmiTable}
`;

    return api.sendMessage(message, threadID, messageID);
};